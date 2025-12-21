'use client'

import * as process from 'process'

if (typeof window !== 'undefined') {
    (window as any).global = window;
    (window as any).process = process;
    (window as any).Buffer = (window as any).Buffer || require('buffer').Buffer;
}
