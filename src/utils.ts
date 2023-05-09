export function wait ( ms: number ) {
    return new Promise( resolve => setTimeout( resolve, ms ) )
}

export function safeParseJSON ( data: string ) {
    try {
        return JSON.parse( data )
    } catch ( error ) {
        return data
    }
}
export function logDeep ( data: unknown ) {
    console.dir( data, { depth: Infinity } )
}