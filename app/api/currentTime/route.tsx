import { NextResponse } from 'next/server';
import dns from 'dns';
import { promisify } from 'util';
import { exec } from 'child_process';
import appInsights from 'applicationinsights';

export const dynamic = 'force-dynamic';

const dnsResolve = promisify(dns.resolve4);
const dnsLookup = promisify(dns.lookup);
const execAsync = promisify(exec);

// Initialize Application Insights (safe to call multiple times; it's idempotent)
if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
    appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
        .setAutoCollectRequests(false)
        .setAutoCollectPerformance(false)
        .setAutoCollectDependencies(false)
        .start();
}

const client = appInsights.defaultClient;

export async function GET() {
    const currentTime = new Date().toLocaleTimeString('en-US');

    const targetUrl = 'https://bing.com';
    const targetHostname = new URL(targetUrl).hostname; // "bing.com"

    let resolvedIPs: string[] = [];
    let lookupAddress = '';
    let fetchStatus = '';
    let digResult = '';
    let nslookupResult = '';

    try {
        // dns.resolve4 queries DNS directly for A records
        resolvedIPs = await dnsResolve(targetHostname);
        console.log(`[DNS Diagnostic] dns.resolve4('${targetHostname}') => ${JSON.stringify(resolvedIPs)}`);
    } catch (err: any) {
        console.log(`[DNS Diagnostic] dns.resolve4('${targetHostname}') failed: ${err.message}`);
    }

    try {
        // dns.lookup uses the OS resolver (respects /etc/hosts, etc.)
        const result = await dnsLookup(targetHostname);
        lookupAddress = result.address;
        console.log(`[DNS Diagnostic] dns.lookup('${targetHostname}') => ${lookupAddress} (family: ${result.family})`);
    } catch (err: any) {
        console.log(`[DNS Diagnostic] dns.lookup('${targetHostname}') failed: ${err.message}`);
    }

    try {
        // Make the actual outbound call to bing.com
        const response = await fetch(targetUrl, { method: 'GET' });
        fetchStatus = `${response.status} ${response.statusText}`;
        console.log(`[DNS Diagnostic] Outbound fetch to ${targetUrl} => ${fetchStatus}`);
    } catch (err: any) {
        fetchStatus = `Failed: ${err.message}`;
        console.log(`[DNS Diagnostic] Outbound fetch to ${targetUrl} failed: ${err.message}`);
    }

    try {
        // Run dig command for full DNS query results
        const { stdout, stderr } = await execAsync(`dig ${targetHostname} +noall +answer +stats`, { timeout: 10000 });
        digResult = stdout.trim() || stderr.trim() || 'No output';
        console.log(`[DNS Diagnostic] dig ${targetHostname}:\n${digResult}`);
    } catch (err: any) {
        // dig may not be installed; fall back to nslookup
        digResult = `dig not available: ${err.message}`;
        console.log(`[DNS Diagnostic] dig failed: ${err.message}`);
        try {
            const { stdout } = await execAsync(`nslookup ${targetHostname}`, { timeout: 10000 });
            nslookupResult = stdout.trim();
            console.log(`[DNS Diagnostic] nslookup ${targetHostname}:\n${nslookupResult}`);
        } catch (nsErr: any) {
            nslookupResult = `nslookup also failed: ${nsErr.message}`;
            console.log(`[DNS Diagnostic] nslookup failed: ${nsErr.message}`);
        }
    }

    // Send all DNS diagnostics to Application Insights
    if (client) {
        client.trackEvent({
            name: 'DNS_Diagnostic',
            properties: {
                targetUrl,
                hostname: targetHostname,
                resolvedIPs: JSON.stringify(resolvedIPs),
                lookupAddress,
                fetchStatus,
                digResult,
                nslookupResult
            }
        });
        client.flush();
        console.log('[DNS Diagnostic] Telemetry sent to Application Insights');
    } else {
        console.log('[DNS Diagnostic] Application Insights client not available — is APPLICATIONINSIGHTS_CONNECTION_STRING set?');
    }

    return NextResponse.json({
        message: `Hello from the API! The current time is ${currentTime}.`
    });
}