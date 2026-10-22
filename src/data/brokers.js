export const brokerDirectory = [
  {
    id: 'spokeo',
    name: 'Spokeo',
    category: 'People-search site',
    region: 'United States',
    website: 'https://www.spokeo.com/',
    optOutUrl: 'https://www.spokeo.com/optout',
    instructions: 'Find the profile that matches you, copy its exact URL, and follow the instructions on Spokeo’s opt-out page. Review any email confirmation before considering the request complete.',
    information: 'May ask for the profile URL and an email address; check the live form before submitting.',
    source: 'Official company opt-out route; URL also appears in a Pennsylvania state victim-services resource.',
    routeStatus: 'Needs live review'
  },
  {
    id: 'whitepages',
    name: 'Whitepages',
    category: 'People-search site',
    region: 'United States',
    website: 'https://www.whitepages.com/',
    optOutUrl: 'https://www.whitepages.com/suppression-requests',
    instructions: 'Locate the matching profile, then follow the official suppression-request flow. Confirm the page is on whitepages.com before entering information.',
    information: 'Have the exact listing URL ready. The live process may request additional verification.',
    source: 'Official company suppression route; URL also appears in a recent public opt-out review.',
    routeStatus: 'Needs live review'
  },
  {
    id: 'beenverified',
    name: 'BeenVerified',
    category: 'People-search site',
    region: 'United States',
    website: 'https://www.beenverified.com/',
    optOutUrl: 'https://www.beenverified.com/app/optout/search',
    instructions: 'Use the official opt-out flow to locate a matching record, then follow the on-page verification steps. If the link redirects, check the final domain before continuing.',
    information: 'The live form may ask you to search for a record and provide an email address.',
    source: 'Official company opt-out route; URL listed in public-sector and privacy-resource guides.',
    routeStatus: 'Needs live review'
  },
  {
    id: 'peopleconnect',
    name: 'PeopleConnect Suppression Center',
    category: 'Shared suppression portal',
    region: 'United States',
    website: 'https://suppression.peopleconnect.us/',
    optOutUrl: 'https://suppression.peopleconnect.us/',
    instructions: 'Check the portal’s current coverage and follow its instructions for each matching service. Do not assume one request covers a service unless the portal explicitly says so.',
    information: 'The current portal may require an email/login step; review the live instructions first.',
    source: 'Official PeopleConnect suppression portal; current service coverage should be confirmed on the portal.',
    routeStatus: 'Needs live review'
  },
  {
    id: 'truepeoplesearch',
    name: 'TruePeopleSearch',
    category: 'People-search site',
    region: 'United States',
    website: 'https://www.truepeoplesearch.com/',
    optOutUrl: 'https://www.truepeoplesearch.com/removal',
    instructions: 'Use the official removal page and follow its current steps to locate and request removal of the matching listing.',
    information: 'Check the live form for the information and email verification it requires.',
    source: 'Official company removal route; URL appears in public-sector and privacy-resource guides.',
    routeStatus: 'Needs live review'
  },
  {
    id: 'fastpeoplesearch',
    name: 'FastPeopleSearch',
    category: 'People-search site',
    region: 'United States',
    website: 'https://www.fastpeoplesearch.com/',
    optOutUrl: 'https://www.fastpeoplesearch.com/removal',
    instructions: 'Open the official removal page and follow the current listing-selection and confirmation steps.',
    information: 'Check the live form; it may involve an email confirmation.',
    source: 'Official company removal route; URL appears in public-sector and privacy-resource guides.',
    routeStatus: 'Needs live review'
  },
  {
    id: 'peoplefinders',
    name: 'PeopleFinders',
    category: 'People-search site',
    region: 'United States',
    website: 'https://www.peoplefinders.com/',
    optOutUrl: 'https://www.peoplefinders.com/opt-out',
    instructions: 'Open the official opt-out page and follow the current instructions for locating and suppressing your information.',
    information: 'Check the live form for the minimum details required to identify your listing.',
    source: 'Official company opt-out route; URL appears in public-sector and privacy-resource guides.',
    routeStatus: 'Needs live review'
  },
  {
    id: 'acxiom',
    name: 'Acxiom',
    category: 'Marketing data provider',
    region: 'United States',
    website: 'https://www.acxiom.com/',
    optOutUrl: 'https://www.acxiom.com/optout/',
    instructions: 'Review Acxiom’s current privacy choices and opt-out process. Confirm that the option applies to your location and the type of data involved.',
    information: 'Requirements vary by request type and jurisdiction; read the official page before submitting.',
    source: 'Official company opt-out route; URL appears in a public data-broker directory.',
    routeStatus: 'Needs live review'
  },
  {
    id: 'liveramp',
    name: 'LiveRamp',
    category: 'Marketing data provider',
    region: 'United States / international',
    website: 'https://liveramp.com/',
    optOutUrl: 'https://liveramp.com/privacy/my-privacy-choices/',
    instructions: 'Review the official privacy choices page and select the controls that apply to your situation and region.',
    information: 'Check the live page for the identifiers or choices required.',
    source: 'Official company privacy-choices route; URL appears in a public data-broker directory.',
    routeStatus: 'Needs live review'
  }
];

export const directoryNotice = 'Starter directory for research, not a guarantee that a company currently holds your data or that a request will succeed. Routes can change; verify the live page and its domain before sharing personal information.';
