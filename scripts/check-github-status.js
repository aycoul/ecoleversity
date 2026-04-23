fetch('https://api.github.com/repos/aycoul/ecoleversity/commits/6408386/status')
  .then(r => r.json())
  .then(d => {
    console.log('State:', d.state);
    console.log('Total count:', d.total_count);
    if (d.statuses && d.statuses.length > 0) {
      d.statuses.forEach(s => {
        console.log(`  ${s.context}: ${s.state} - ${s.description}`);
      });
    } else {
      console.log('No status checks found');
    }
  })
  .catch(e => console.error('Error:', e.message));
