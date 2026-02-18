'use client';

import { useEffect, useState } from 'react';

interface DnsDiagnostics {
    targetUrl: string;
    hostname: string;
    resolvedIPs: string[];
    lookupAddress: string;
    fetchStatus: string;
}

export function CurrentTimeFromAPI(){
    const [apiResponse, setApiResponse] = useState('');
    const [dnsDiag, setDnsDiag] = useState<DnsDiagnostics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/currentTime')
            .then((res) => res.json())
            .then((data) => {
                setApiResponse(data.message);
                setDnsDiag(data.dnsDiagnostics);
                console.log('[DNS Diagnostic] Response:', JSON.stringify(data.dnsDiagnostics, null, 2));
                setLoading(false);
            });
        }, 
    []);

    return (
        <div className='pt-4'>
            <div>The message from the API is: <strong>{apiResponse}</strong></div>
            {dnsDiag && (
                <div className='mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono'>
                    <div className='font-bold mb-2'>DNS Diagnostics (outbound to {dnsDiag.targetUrl})</div>
                    <div>Hostname: <strong>{dnsDiag.hostname}</strong></div>
                    <div>dns.resolve4 IPs: <strong>{dnsDiag.resolvedIPs.length > 0 ? dnsDiag.resolvedIPs.join(', ') : 'N/A'}</strong></div>
                    <div>dns.lookup IP: <strong>{dnsDiag.lookupAddress || 'N/A'}</strong></div>
                    <div>Fetch status: <strong>{dnsDiag.fetchStatus || 'N/A'}</strong></div>
                </div>
            )}
        </div>
    )
}