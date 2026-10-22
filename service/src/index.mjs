import { createServer } from "node:http";
import { createCipheriv, createDecipheriv, randomBytes, randomUUID, timingSafeEqual, createHash } from "node:crypto";
import { mkdirSync, chmodSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

export const providers = Object.freeze([
  { id:"spokeo", name:"Spokeo", region:"United States", optOutUrl:"https://www.spokeo.com/optout", website:"https://www.spokeo.com/", host:"www.spokeo.com", enabled:true, mode:"browser-assisted", limitation:"Experimental. Email confirmation may be required; form changes or security checks pause automation." },
  { id:"whitepages", name:"Whitepages", region:"United States", optOutUrl:"https://www.whitepages.com/suppression-requests", website:"https://www.whitepages.com/", enabled:false, mode:"manual-assisted", limitation:"May require phone verification; automated submission is disabled." },
  { id:"beenverified", name:"BeenVerified", region:"United States", optOutUrl:"https://www.beenverified.com/app/optout/search", website:"https://www.beenverified.com/", enabled:false, mode:"manual-assisted", limitation:"Current verification steps need live testing; automated submission is disabled." },
  { id:"peoplefinders", name:"PeopleFinders", region:"United States", optOutUrl:"https://www.peoplefinders.com/opt-out", website:"https://www.peoplefinders.com/", enabled:false, mode:"manual-assisted", limitation:"CAPTCHA/email confirmation may be required; automated submission is disabled." },
  { id:"california-drop", name:"California DROP", region:"Eligible California residents", optOutUrl:"https://consumer.drop.privacy.ca.gov/", website:"https://privacy.ca.gov/drop/", enabled:false, mode:"user-completed-government-flow", limitation:"The eligible resident completes the official government workflow directly." }
]);
export const getProvider = id => providers.find(item => item.id === id) || null;
const keyFromHex = hex => {
  if (typeof hex !== "string" || !/^[a-f0-9]{64}$/i.test(hex)) throw Error("Encryption key must be 64 hex characters.");
  return Buffer.from(hex, "hex");
};
export function encryptJson(value, key) {
  if (!Buffer.isBuffer(key) || key.length !== 32) throw Error("Encryption key must be 32 bytes.");
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64url");
}
export function decryptJson(value, key) {
  const packed = Buffer.from(value, "base64url");
  if (packed.length < 29) throw Error("Invalid encrypted payload.");
  const decipher = createDecipheriv("aes-256-gcm", key, packed.subarray(0,12));
  decipher.setAuthTag(packed.subarray(12,28));
  return JSON.parse(Buffer.concat([decipher.update(packed.subarray(28)), decipher.final()]).toString("utf8"));
}
export function validateListingUrl(providerId, value) {
  const provider = getProvider(providerId);
  if (!provider || !provider.host) throw Error("This provider does not support a single-listing URL.");
  let url;
  try { url = new URL(value); } catch { throw Error("Enter a valid listing URL."); }
  if (url.protocol !== "https:" || url.hostname.toLowerCase() !== provider.host || url.port || url.username || url.password) throw Error("Listing URL must use HTTPS and the provider's exact official hostname.");
  if (url.pathname === "/" || /opt.?out|privacy|suppression/i.test(url.pathname)) throw Error("Enter the personal listing URL, not an opt-out page.");
  return url.toString();
}
const textField = (value, name, max) => {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw Error(name + " is required (maximum " + max + " characters).");
  return value.trim();
};
export function validateJobInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw Error("JSON object required.");
  const provider = getProvider(input.providerId);
  if (!provider) throw Error("Unsupported provider.");
  if (!provider.enabled || provider.mode !== "browser-assisted") throw Error("Automated submission is not enabled for this provider. Use its official route manually.");
  if (input.consent?.dataProcessing !== true || input.consent?.submitRequest !== true) throw Error("Explicit processing consent and authorization for this request are required.");
  const name = textField(input.profile?.fullName, "Full name", 120);
  const email = textField(input.profile?.email, "Email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error("Enter a valid email address.");
  const country = textField(input.profile?.country, "Country or region", 80);
  return { providerId:provider.id, listingUrl:validateListingUrl(provider.id, input.listingUrl), profile:{fullName:name,email,country}, consentedAt:new Date().toISOString() };
}
export class RemovalJobStore {
  constructor({databasePath, encryptionKey}) {
    this.key = encryptionKey;
    const path = databasePath === ":memory:" ? ":memory:" : resolve(databasePath);
    if (path !== ":memory:") mkdirSync(dirname(path), {recursive:true, mode:0o700});
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA secure_delete=ON; CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, provider_id TEXT NOT NULL, status TEXT NOT NULL, step TEXT NOT NULL, message TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, submitted_at TEXT)");
    if (path !== ":memory:") chmodSync(path, 0o600);
  }
  create(providerId, payload) {
    const id = randomUUID(), now = new Date().toISOString();
    this.db.prepare("INSERT INTO jobs VALUES (?,?, 'queued','ready','Ready for an explicit submission run.',?,?,?,NULL)").run(id,providerId,encryptJson(payload,this.key),now,now);
    return this.get(id);
  }
  get(id) {
    const row = this.db.prepare("SELECT id,provider_id,status,step,message,created_at,updated_at,submitted_at FROM jobs WHERE id=?").get(id);
    return row ? {id:row.id,providerId:row.provider_id,status:row.status,step:row.step,message:row.message,createdAt:row.created_at,updatedAt:row.updated_at,submittedAt:row.submitted_at} : null;
  }
  list() { return this.db.prepare("SELECT id FROM jobs ORDER BY created_at DESC LIMIT 100").all().map(row => this.get(row.id)); }
  payload(id) { const row=this.db.prepare("SELECT payload FROM jobs WHERE id=?").get(id); return row ? decryptJson(row.payload,this.key) : null; }
  status(id,status,step,message,submitted=false) {
    const now=new Date().toISOString();
    if(submitted) this.db.prepare("UPDATE jobs SET status=?,step=?,message=?,submitted_at=?,updated_at=? WHERE id=?").run(status,step,message,now,now,id);
    else this.db.prepare("UPDATE jobs SET status=?,step=?,message=?,updated_at=? WHERE id=?").run(status,step,message,now,id);
    return this.get(id);
  }
  delete(id) { this.db.prepare("DELETE FROM jobs WHERE id=?").run(id); }
  close() { this.db.close(); }
}
async function antiBot(page) {
  const body=(await page.locator("body").innerText().catch(()=> "")).toLowerCase();
  return /verify you are human|unusual traffic|access denied|security challenge|robot check/.test(body) ||
    await page.locator('iframe[src*="recaptcha"],iframe[src*="hcaptcha"],.g-recaptcha,.h-captcha,[name="cf-turnstile-response"]').count().then(n=>n>0).catch(()=>false);
}
export async function submitSpokeo(payload, {showBrowser=false}={}) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({headless:!showBrowser});
  try {
    const page=await browser.newPage(); page.setDefaultTimeout(8000);
    await page.goto("https://www.spokeo.com/optout",{waitUntil:"domcontentloaded",timeout:30000});
    const current=new URL(page.url());
    if(current.protocol!=="https:" || !["spokeo.com","www.spokeo.com"].includes(current.hostname)) return {status:"needs_manual_action",step:"domain_changed",submitted:false,message:"The official domain changed. Nothing was submitted."};
    if(await antiBot(page)) return {status:"needs_manual_action",step:"human_check",submitted:false,message:"A human/security check appeared. Automation stopped without bypassing it."};
    const listing=page.locator('input[type="url"],input[name*="url" i],input[placeholder*="url" i]').first();
    const email=page.locator('input[type="email"],input[name*="email" i]').first();
    if(!await listing.count() || !await email.count()) return {status:"needs_manual_action",step:"form_changed",submitted:false,message:"The current form differs from the adapter. Nothing was submitted."};
    await listing.fill(payload.listingUrl); await email.fill(payload.profile.email);
    const button=page.getByRole("button",{name:/opt.?out|submit/i}).first();
    const submit=page.locator('input[type="submit"]').first();
    if(await button.count()) await button.click();
    else if(await submit.count()) await submit.click();
    else return {status:"needs_manual_action",step:"submit_not_found",submitted:false,message:"Submit button not identified; nothing was submitted."};
    await page.waitForTimeout(1200);
    const body=(await page.locator("body").innerText().catch(()=> "")).toLowerCase();
    if(/check your email|confirmation email|verify your email|email has been sent/.test(body)) return {status:"awaiting_email_confirmation",step:"email_confirmation",submitted:true,message:"The form appears submitted. Complete the provider's email confirmation."};
    return {status:"submitted_needs_review",step:"review_provider_response",submitted:true,message:"The form may have been submitted, but removal is not confirmed. Review the provider response."};
  } finally { await browser.close().catch(()=>{}); }
}
const hash = value => createHash("sha256").update(value).digest();
const authOK = (expected, supplied) => !!expected && !!supplied && timingSafeEqual(hash(expected),hash(supplied));
const json = (res, code, data, origin) => {
  res.writeHead(code, {"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","referrer-policy":"no-referrer",...(origin?{"access-control-allow-origin":origin,"vary":"Origin"}:{})});
  res.end(JSON.stringify(data));
};
async function readBody(req) {
  if(!String(req.headers["content-type"]||"").toLowerCase().startsWith("application/json")) throw Object.assign(Error("Content-Type must be application/json."),{statusCode:415});
  let body="";
  for await(const chunk of req) { body+=chunk; if(Buffer.byteLength(body)>32768) throw Object.assign(Error("Request body too large."),{statusCode:413}); }
  try { return JSON.parse(body||"{}"); } catch { throw Object.assign(Error("Invalid JSON body."),{statusCode:400}); }
}
export function createRemovalServer({store,token,allowedOrigin="http://localhost:5173",showBrowser=false,runProvider=submitSpokeo}) {
  if(!store||!token) throw Error("A store and service token are required.");
  return createServer(async(req,res)=>{
    const origin=req.headers.origin;
    if(origin && origin!==allowedOrigin) return json(res,403,{error:"Origin not allowed."});
    if(req.method==="OPTIONS") { res.writeHead(204,{"access-control-allow-origin":allowedOrigin,"access-control-allow-methods":"GET,POST,DELETE,OPTIONS","access-control-allow-headers":"authorization,content-type","vary":"Origin"}); return res.end(); }
    let url; try { url=new URL(req.url||"/","http://localhost"); } catch { return json(res,400,{error:"Invalid URL."}); }
    if(req.method==="GET"&&url.pathname==="/healthz") return json(res,200,{ok:true,service:"removeme-helper-service"},origin);
    if(req.method==="GET"&&url.pathname==="/api/providers") return json(res,200,{providers:providers.map(({id,name,region,website,optOutUrl,enabled,mode,limitation})=>({id,name,region,website,optOutUrl,enabled,mode,limitation}))},origin);
    const bearer=String(req.headers.authorization||"").match(/^Bearer\s+(.+)$/i);
    if(!bearer||!authOK(token,bearer[1])) return json(res,401,{error:"Valid bearer token required."},origin);
    try {
      if(req.method==="GET"&&url.pathname==="/api/jobs") return json(res,200,{jobs:store.list()},origin);
      if(req.method==="POST"&&url.pathname==="/api/jobs") {
        let input; try { input=validateJobInput(await readBody(req)); } catch(e) { return json(res,e.statusCode||422,{error:e.message},origin); }
        return json(res,201,{job:store.create(input.providerId,input),nextAction:"Review the request, then explicitly run it."},origin);
      }
      const match=url.pathname.match(/^\/api\/jobs\/([0-9a-f-]{36})(?:\/(run))?$/i);
      if(match&&req.method==="GET"&&!match[2]) { const job=store.get(match[1]); return job?json(res,200,{job},origin):json(res,404,{error:"Job not found."},origin); }
      if(match&&req.method==="DELETE"&&!match[2]) { const job=store.get(match[1]); if(!job)return json(res,404,{error:"Job not found."},origin); if(job.status==="running")return json(res,409,{error:"Cannot delete a running job."},origin); store.delete(job.id); return json(res,200,{deleted:true},origin); }
      if(match&&req.method==="POST"&&match[2]) {
        const job=store.get(match[1]); if(!job)return json(res,404,{error:"Job not found."},origin);
        if(job.status!=="queued") return json(res,409,{error:"This job has already been run or cannot run."},origin);
        const payload=store.payload(job.id); store.status(job.id,"running","open_form","Opening official opt-out form.");
        try {
          const result=await runProvider(payload,{showBrowser});
          const allowed=new Set(["awaiting_email_confirmation","submitted_needs_review","needs_manual_action"]);
          const final=allowed.has(result?.status)?result:{status:"needs_manual_action",step:"invalid_adapter_result",submitted:false,message:"The adapter returned an unknown result."};
          return json(res,200,{job:store.status(job.id,final.status,final.step,final.message,!!final.submitted)},origin);
        } catch {
          return json(res,200,{job:store.status(job.id,"needs_manual_action","automation_error","The provider flow could not be completed safely. Continue on the official page.")},origin);
        }
      }
      return json(res,404,{error:"Route not found."},origin);
    } catch { return json(res,500,{error:"Request could not be processed."},origin); }
  });
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const token=process.env.REMOVEME_API_TOKEN||"", secret=process.env.REMOVEME_ENCRYPTION_KEY||"";
  if(!/^[a-f0-9]{64}$/i.test(token)){console.error("REMOVEME_API_TOKEN must be 64 hex characters; generate with openssl rand -hex 32.");process.exit(1);}
  let key; try{key=keyFromHex(secret);}catch(e){console.error(e.message);process.exit(1);}
  const store=new RemovalJobStore({databasePath:process.env.DATABASE_PATH||resolve("data/removals.sqlite"),encryptionKey:key});
  const host=process.env.HOST||"127.0.0.1",port=Number(process.env.PORT||8787);
  const server=createRemovalServer({store,token,allowedOrigin:process.env.ALLOWED_ORIGIN||"http://localhost:5173",showBrowser:process.env.SHOW_BROWSER==="true"});
  server.listen(port,host,()=>console.log("RemoveMe Helper service listening at http://"+host+":"+port));
  const stop=()=>server.close(()=>{store.close();process.exit(0);});
  process.on("SIGINT",stop); process.on("SIGTERM",stop);
}
