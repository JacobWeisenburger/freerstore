// import { z } from 'zod'
// import { logResult } from './logResult'
// // import { kvStorage } from './storage'

// // function getStorageKey ( date: Date = new Date ): string {
// //     const [ plainDateString ] = date.toISOString().split( 'T' )
// //     return `firestoreStats.${ plainDateString }.json`
// //         .replaceAll( '/', '.' )
// //         .replaceAll( ' ', '_' )
// // }

// export module firestoreStats {
//     const schema = z.object( {
//         reads: z.number().int().nonnegative(),
//         writes: z.number().int().nonnegative(),
//     } ).partial()

//     export function log () {
//         logResult( 'firestoreStats' )( firestoreStats.get() )
//     }

//     export function get ( key: string = getStorageKey() ) {
//         return schema.safeParse( kvStorage.getItem( key ) ?? { reads: 0, writes: 0 } )
//     }
//     export function incrementReads ( amount: number = 1 ) {
//         const key = getStorageKey()
//         const statsResult = get()
//         if ( statsResult.success ) {
//             const stats = statsResult.data
//             kvStorage.setItem( key, {
//                 ...stats,
//                 reads: ( stats.reads ?? 0 ) + amount,
//             } )
//         }
//     }
//     export function incrementWrites () {
//         const key = getStorageKey()
//         const statsResult = get()
//         if ( statsResult.success ) {
//             const stats = statsResult.data
//             kvStorage.setItem( key, {
//                 ...stats,
//                 writes: ( stats.writes ?? 0 ) + 1,
//             } )
//         }
//     }
// }