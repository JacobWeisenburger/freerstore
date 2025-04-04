import { Result } from '@weis-guys/result'

export function getExeCtx () {
    return typeof process === 'undefined' ? 'browser' : 'server'
}

export function safeParseJSON ( data: string ) {
    try {
        return Result.ok( JSON.parse( data ) )
    } catch ( error ) {
        return Result( { data, error } )
    }
}

export function prune ( data: unknown ) {
    return JSON.parse( JSON.stringify( data ) )
}

export function pretty ( data: unknown ) {
    return JSON.stringify( data, replacer, 2 )
}

function replacer ( key: string, value: unknown ) {
    if ( value instanceof Map ) return Object.fromEntries( value )
    if ( value instanceof Set ) return [ ...value ]
    return value
}

// export function logDeep ( data: unknown ) {
//     console.dir( data, { depth: Infinity } )
// }

// type CoerceFrom = 'isoString'
// type CoerceTo = 'isoString' | 'date'
// export function deepClone (
//     data: unknown,
//     coercionMap?: Record<CoerceFrom, CoerceTo | undefined>
// ) {
//     return JSON.parse(
//         JSON.stringify( data ),
//         ( key: string, value: unknown ) => {

//             if ( coercionMap?.isoString == 'date' ) {
//                 /* handle ISO string to Date */
//                 const parsedDate = z.string().datetime().pipe( z.coerce.date() ).safeParse( value )
//                 if ( parsedDate.success ) return parsedDate.data
//             }

//             return value
//         }
//     )
// }

// export function wait ( ms: number ) {
//     return new Promise( resolve => setTimeout( resolve, ms ) )
// }

// export function defer () {
//     let resolve = () => { }
//     const promise = new Promise<void>( resolvePromise => resolve = resolvePromise )
//     return {
//         promise,
//         resolve: () => { resolve() },
//     }
// }