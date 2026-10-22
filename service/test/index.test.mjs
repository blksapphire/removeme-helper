import test from "node:test";
import assert from "node:assert/strict";
import { RemovalJobStore, createRemovalServer, decryptJson, encryptJson, getProvider, providers, validateJobInput, validateListingUrl } from "../src/index.mjs";

const key = Buffer.alloc(32, 9);
const token = "c".repeat(64);
const input = () => ({
  providerId:"spokeo",
  listingUrl:"https://www.spokeo.com/profile/example-123",
  profile:{fullName:"Example Person",email:"person@example.com",country:"Nigeria"},
  consent:{dataProcessing:true,submitRequest:true}
});
const headers = {authorization:"Bearer "+token,"content-type":"application/json"};
async function withServer(runProvider, fn) {
  const store = new RemovalJobStore({databasePath:":memory:",encryptionKey:key});
  const server = createRemovalServer({store,token,allowedOrigin:"http://localhost:5173",runProvider});
  await new Promise(resolve => server.listen(0,"127.0.0.1",resolve));
  const base = "http://127.0.0.1:"+server.address().port;
  try { await fn({base,store}); }
  finally { await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve())); store.close(); }
}

test("authenticated encryption round-trips and detects tampering", () => {
  const payload={email:"private@example.com",name:"Example Person"};
  const packed=encryptJson(payload,key);
  assert.deepEqual(decryptJson(packed,key),payload);
  assert.equal(packed.includes(payload.email),false);
  assert.throws(()=>decryptJson(packed.slice(0,-2)+"aa",key));
});

test("only Spokeo is enabled in the experimental adapter", () => {
  assert.equal(getProvider("spokeo").enabled,true);
  assert.equal(getProvider("whitepages").enabled,false);
  assert.equal(getProvider("california-drop").mode,"user-completed-government-flow");
  assert.ok(providers.length >= 5);
});

test("listing URL allow-list rejects off-domain URLs and opt-out pages", () => {
  assert.equal(validateListingUrl("spokeo","https://www.spokeo.com/profile/123"),"https://www.spokeo.com/profile/123");
  assert.throws(()=>validateListingUrl("spokeo","http://www.spokeo.com/profile/123"),/HTTPS/);
  assert.throws(()=>validateListingUrl("spokeo","https://spokeo.com.attacker.example/profile/123"),/official hostname/);
  assert.throws(()=>validateListingUrl("spokeo","https://attacker.example/profile/123"),/official hostname/);
  assert.throws(()=>validateListingUrl("spokeo","https://www.spokeo.com/optout"),/personal listing/);
});

test("consent and profile validation reject invalid requests", () => {
  assert.equal(validateJobInput(input()).profile.email,"person@example.com");
  const noConsent=input(); noConsent.consent.submitRequest=false;
  assert.throws(()=>validateJobInput(noConsent),/consent/);
  const disabled=input(); disabled.providerId="whitepages";
  assert.throws(()=>validateJobInput(disabled),/not enabled/);
  const badEmail=input(); badEmail.profile.email="not-email";
  assert.throws(()=>validateJobInput(badEmail),/valid email/);
});

test("API hides personal data and prevents repeat submission", async () => {
  await withServer(async()=>({status:"awaiting_email_confirmation",step:"email_confirmation",submitted:true,message:"Confirm by email."}),async({base,store})=>{
    assert.equal((await fetch(base+"/healthz")).status,200);
    assert.equal((await fetch(base+"/api/jobs")).status,401);
    const response=await fetch(base+"/api/jobs",{method:"POST",headers,body:JSON.stringify(input())});
    assert.equal(response.status,201);
    const job=(await response.json()).job;
    assert.equal(job.status,"queued");
    assert.equal(JSON.stringify(job).includes(input().profile.email),false);
    const raw=store.db.prepare("SELECT payload FROM jobs").get().payload;
    assert.equal(raw.includes(input().profile.email),false);
    const result=await fetch(base+"/api/jobs/"+job.id+"/run",{method:"POST",headers});
    assert.equal((await result.json()).job.status,"awaiting_email_confirmation");
    assert.equal((await fetch(base+"/api/jobs/"+job.id+"/run",{method:"POST",headers})).status,409);
  });
});

test("rejects foreign origins and supports deletion", async () => {
  await withServer(async()=>({status:"needs_manual_action",step:"manual",submitted:false,message:"Continue manually."}),async({base,store})=>{
    const denied=await fetch(base+"/api/jobs",{method:"POST",headers:{...headers,origin:"https://attacker.example"},body:JSON.stringify(input())});
    assert.equal(denied.status,403);
    const response=await fetch(base+"/api/jobs",{method:"POST",headers,body:JSON.stringify(input())});
    const job=(await response.json()).job;
    assert.equal((await fetch(base+"/api/jobs/"+job.id,{method:"DELETE",headers})).status,200);
    assert.equal(store.payload(job.id),null);
  });
});