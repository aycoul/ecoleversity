const commits = ['d79db96', '7ac8309', 'e587159', '8313e2d', 'd7d8d6a', '6408386'];

async function checkStatus(sha) {
  const res = await fetch(`https://api.github.com/repos/aycoul/ecoleversity/commits/${sha}/status`);
  const data = await res.json();
  const vercelStatus = data.statuses.find(s => s.context === 'Vercel');
  return {
    sha,
    state: data.state,
    vercel: vercelStatus ? `${vercelStatus.state} - ${vercelStatus.description}` : 'No Vercel status'
  };
}

(async () => {
  for (const sha of commits) {
    const result = await checkStatus(sha);
    console.log(`${result.sha}: ${result.state} | Vercel: ${result.vercel}`);
  }
})();
