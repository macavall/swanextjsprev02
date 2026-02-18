import { NextResponse } from 'next/server';
import dns from 'dns';
import { promisify } from 'util';

export const dynamic = 'force-dynamic';

const dnsResolve = promisify(dns.resolve4);
const dnsLookup = promisify(dns.lookup);

export async function GET(request: Request) {
    const currentTime = new Date().toLocaleTimeString('en-US');

    // Get the hostname from the incoming request
    const url = new URL(request.url);
    const hostname = url.hostname;

    let resolvedIPs: string[] = [];
    let lookupAddress = '';

    try {
        // dns.resolve4 queries DNS directly for A records
        resolvedIPs = await dnsResolve(hostname);
        console.log(`[DNS Diagnostic] dns.resolve4('${hostname}') => ${JSON.stringify(resolvedIPs)}`);
    } catch (err: any) {
        console.log(`[DNS Diagnostic] dns.resolve4('${hostname}') failed: ${err.message}`);
    }

    try {
        // dns.lookup uses the OS resolver (respects /etc/hosts, etc.)
        const result = await dnsLookup(hostname);
        lookupAddress = result.address;
        console.log(`[DNS Diagnostic] dns.lookup('${hostname}') => ${lookupAddress} (family: ${result.family})`);
    } catch (err: any) {
        console.log(`[DNS Diagnostic] dns.lookup('${hostname}') failed: ${err.message}`);
    }

    return NextResponse.json({
        message: `Hello from the API! The current time is ${currentTime}.`,
        dnsDiagnostics: {
            hostname,
            resolvedIPs,
            lookupAddress
        }
    });
}