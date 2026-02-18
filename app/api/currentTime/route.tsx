import { NextResponse } from 'next/server';
import dns from 'dns';
import { promisify } from 'util';

export const dynamic = 'force-dynamic';

const dnsResolve = promisify(dns.resolve4);
const dnsLookup = promisify(dns.lookup);

export async function GET() {
    const currentTime = new Date().toLocaleTimeString('en-US');

    const targetUrl = 'https://bing.com';
    const targetHostname = new URL(targetUrl).hostname; // "bing.com"

    let resolvedIPs: string[] = [];
    let lookupAddress = '';
    let fetchStatus = '';

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

    return NextResponse.json({
        message: `Hello from the API! The current time is ${currentTime}.`,
        dnsDiagnostics: {
            targetUrl,
            hostname: targetHostname,
            resolvedIPs,
            lookupAddress,
            fetchStatus
        }
    });
}