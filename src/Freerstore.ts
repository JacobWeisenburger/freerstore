import { z } from 'zod'
// import { Firestore } from './Firestore'
import { ModifiedAtPropType } from './types'
import { pretty, prune } from './utils'
import { cluster, debounce } from 'radash'
import { Result } from '@weis-guys/result'
import { collection, Firestore, getFirestore } from 'firebase/firestore'
import { FirebaseApp } from 'firebase/app'

// https://console.firebase.google.com/u/0/project/freerstore-tests/firestore/data/~2F_test-collection

function debouncedPromise<Fn extends ( ...args: any[] ) => any> (
    delayMS: number,
    func: Fn
) {
    let timer: NodeJS.Timeout | undefined
    return ( ...args: Parameters<Fn> ) => {
        return new Promise<ReturnType<Fn>>( resolve => {
            clearTimeout( timer )
            timer = setTimeout( () => { resolve( func( ...args ) ) }, delayMS )
        } )
    }
}

export namespace Freerstore {
    export function getCollection ( {
        // firestore,
        firebaseApp,
        ...props
    }: {
        firebaseApp: FirebaseApp,
        // firestore: Firestore,
        // firestore: Firestore.Firestore,
        path: string,
        freerstoreSectionKey?: string,
        modifiedAtKey?: string,
        modifiedAtType?: ModifiedAtPropType,
        serverWriteDelayMs?: number,
    } ) {
        // Firestore
        const firestore = getFirestore( firebaseApp )

        console.log( firestore.constructor.name )
        console.log( firestore instanceof Firestore )
        const collectionRef = collection( firestore, 'path' )

        // props.freerstoreSectionKey ??= 'freerstore'
        // props.modifiedAtKey ??= 'modifiedAt'
        // props.modifiedAtType ??= 'isoString'
        // props.serverWriteDelayMs ??= 1000

        // const {
        //     freerstoreSectionKey,
        //     modifiedAtKey,
        //     modifiedAtType,
        //     serverWriteDelayMs,
        //     path,
        // } = props

        // const idSchema = z.string()
        // const dataSchema = z.record( z.unknown() )
        //     .transform( data => ( {
        //         ...data,
        //         [ freerstoreSectionKey ]: {
        //             [ modifiedAtKey ]: {
        //                 isoString: new Date().toISOString(),
        //                 date: new Date(),
        //             }[ modifiedAtType ],
        //         },
        //     } ) )
        // type Data = z.infer<typeof dataSchema>
        // console.log( Firestore.collection )
        // console.log( { firestore } )
        // console.log( { path } )

        // const collectionRef = Firestore.collection( firestore, path ) as Firestore.CollectionReference
        // console.log( { collectionRef } )

        // type PendingParse = {
        //     data: Data
        //     fn: () => Promise<unknown>
        // }
        // const pendingParseMap = new Map<string, PendingParse>()
        // const addPendingParse = ( { id, data, delayMs = serverWriteDelayMs / 2 }: {
        //     id: string
        //     data: Data
        //     delayMs: number
        // } ) => {
        //     if ( typeof window !== 'undefined' ) {
        //         window.onbeforeunload = e => e.preventDefault()
        //     }

        //     const fn = pendingParseMap.get( id )?.fn
        //         ?? debouncedPromise( delayMs, () => {
        //             const data = pendingParseMap.get( id )?.data
        //             pendingParseMap.delete( id )

        //             const parsedId = idSchema.safeParse( id )
        //             if ( !parsedId.success ) {
        //                 return Result( {
        //                     data, error: [
        //                         `Invalid Id: ${ id }`,
        //                         ...parsedId.error.format()._errors,
        //                     ] as string[]
        //                 } )
        //             }

        //             const parsed = dataSchema.safeParse( data )
        //             if ( !parsed.success ) {
        //                 return Result( {
        //                     data, error: [
        //                         `Invalid Data`,
        //                         ...parsed.error.format()._errors,
        //                     ] as string[]
        //                 } )
        //             }

        //             if ( typeof window !== 'undefined' ) {
        //                 window.onbeforeunload = null
        //             }

        //             pendingWriteMap.set( parsedId.data, parsed.data )
        //             return Result.ok( prune( parsed.data ) )
        //         } )

        //     pendingParseMap.set( id, { data, fn } )
        //     return fn()
        // }

        // const pendingWriteMap = new Map<string, Data>()
        // const serverWrite = debounce(
        //     { delay: serverWriteDelayMs },
        //     async () => {
        //         // emit( 'serverWriteStart' )

        //         const results = {
        //             success: new Map<string, Data>(),
        //             fail: new Map<string, Result<unknown, unknown>>(),
        //         }
        //         const items = [ ...pendingWriteMap ]
        //         if ( items.length == 0 ) return

        //         const batches = cluster( items, 500 ).map( entries => {
        //             const batch = Firestore.writeBatch( firestore )
        //             entries.forEach( ( [ id, data ] ) => {
        //                 try {
        //                     batch.set( Firestore.doc( collectionRef, id ), data )
        //                     results.success.set( id, data )
        //                     pendingWriteMap.delete( id )
        //                 } catch ( error ) {
        //                     if ( error instanceof Error ) {
        //                         results.fail.set( id, Result( { data, error: error.message } ) )
        //                     } else {
        //                         console.error( error )
        //                         results.fail.set( id, Result( { data, error: 'check console for error' } ) )
        //                     }
        //                 }
        //             } )
        //             return batch
        //         } )

        //         await Promise.all( batches.map( x => x.commit() ) )
        //         pendingWriteMap.clear()

        //         // emit( 'serverWriteEnd', { results, batches } )
        //         console.log( pretty( results ) )
        //     }
        // )

        // return {
        //     props,
        //     async setDoc ( id: string, data: Data ) {
        //         serverWrite()
        //         return addPendingParse( { id, data, delayMs: 500 } )
        //     },
        //     setDocs ( docs: Record<string, Data> = {} ) {
        //         // return new Map(
        //         //     Object.entries( docs )
        //         //         .map( ( [ id, docData ] ) => this.setDoc( id, docData ) )
        //         // )
        //     },
        //     deleteDoc ( id: string ) {
        //         /* todo allow marking doc as deleted */
        //     },
        // }
    }
}




// const abrtCtl = new AbortController()

// const prom = new Promise( ( resolve, reject ) => {
//     console.clear()
//     const timeout = setTimeout( () => resolve( 'should never complete' ), 100 )

//     abrtCtl.signal.addEventListener( 'abort', () => {
//         clearTimeout( timeout )
//         console.log( 'aborted' )
//     } )

//     abrtCtl.abort()
// } )

// console.log( await prom )









// const modifiedAtPropPath = [ freerstoreSectionKey, modifiedAtKey ].join( '.' )

// const lastSync = makeLastSync( {
//     dbName: dbName,
//     storeName: key,
//     modifiedAtType: modifiedAtType,
// } )

// const asyncStore = LocalDB
//     .db( dbName )
//     .asyncStore( key )

// asyncStore.setItem( 'foo', 'foo' )
// console.log( await asyncStore.getAll() )

// query ( ...queryConstraints: Firestore.QueryConstraint[] ) {
//     return Firestore.query(
//         collectionRef,
//         ...queryConstraints,
//         Firestore.where( modifiedAtPropPath, '>', lastSync.get() )
//     )
// },
// async getDocFromCache ( id: string ): Promise<ResultEntry> {
//     return [ id, await asyncStore.get( id ) ]
// },
// async getAllFromCache (): Promise<DocResultsMap> {
//     return asyncStore.getAll()
// },