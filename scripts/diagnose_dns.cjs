const dns = require('dns');
const { promisify } = require('util');

const resolveTv4 = promisify(dns.resolve4);
const hostname = 'db.vdwhijmbelfnmpodpptn.supabase.co';

async function checkDNS() {
    console.log(`Resolving ${hostname}...`);
    try {
        // Try system DNS first
        const addresses = await resolveTv4(hostname);
        console.log('System DNS success:', addresses);
        return addresses[0];
    } catch (e) {
        console.error('System DNS failed:', e.message);

        // Try custom DNS (DoH request loosely simulated or just forcing lookup if possible, 
        // but Node's dns module uses system resolver by default. 
        // We'll trust the user has internet.)
        console.log('Please try changing your connection string to use the IP address if you know it.');

        // Attempt to fetch via HTTPS to see if that works (sanity check)
        try {
            const httpsRes = await fetch('https://vdwhijmbelfnmpodpptn.supabase.co');
            console.log('HTTPS Connection to project URL: ' + (httpsRes.ok ? 'OK' : 'Failed ' + httpsRes.status));
            console.log('If HTTPS works, the issue is likely specific to the DB domain DNS or port 5432 blocking.');
        } catch (err) {
            console.error('HTTPS Connection failed:', err.message);
        }
    }
}

checkDNS();
