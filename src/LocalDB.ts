import localforage from 'localforage'
import { z } from 'zod'
import { getExeCtx } from './getExeCtx'

// https://localforage.github.io/localForage/

export module LocalDB {

    export type DB = {
        name: string
        asyncStore<Schema extends z.Schema> (
            name: string,
            schema: Schema,
        ): AsyncStore<z.input<Schema>, z.output<Schema>>
        syncStore<Schema extends z.Schema> (
            name: string,
            schema: Schema,
        ): SyncStore<z.input<Schema>, z.output<Schema>>
    }

    export type AsyncStore<Input, Output> = {
        name: string
        set ( key: string, input: Input ): Promise<z.SafeParseReturnType<Input, Output>>
        get ( key: string ): Promise<z.SafeParseReturnType<Input, Output>>
        remove ( key: string ): Promise<void>
    }

    export type SyncStore<Input, Output> = {
        name: string
        set ( key: string, input: Input ): z.SafeParseReturnType<Input, Output>
        get ( key: string ): z.SafeParseReturnType<Input, Output>
        remove ( key: string ): void
    }

    export function db ( name: string ) {
        const db: DB = {
            name,
            asyncStore<Schema extends z.Schema> (
                name: string,
                schema: Schema,
            ) {
                const store = localforage.createInstance( {
                    name: db.name,
                    storeName: name,
                    driver: localforage.INDEXEDDB,
                } )

                return {
                    name,
                    async set ( key, input ) {
                        const parsed = schema.safeParse( input )
                        if ( parsed.success ) await store.setItem( key, parsed.data )
                        return parsed
                    },
                    async get ( key ) {
                        const value = await store.getItem( key )
                        return schema.safeParse( value )
                    },
                    async remove ( key: string ) {
                        return store.removeItem( key )
                    },
                }
            },
            syncStore<Schema extends z.Schema> (
                name: string,
                schema: Schema,
            ) {
                function stringify ( data: any ) {
                    const spaces = getExeCtx() == 'node' ? 4 : 0
                    return JSON.stringify( data, null, spaces )
                }

                type Path = {
                    dbName: string,
                    storeName: string,
                    key: string,
                    ext?: string,
                }
                const delimiter = getExeCtx() == 'node' ? '~' : '/'
                function pathToString ( path: Path ): string {
                    const { dbName, storeName, key, ext } = path
                    return [
                        [ dbName, storeName, key ].join( delimiter ),
                        ext
                    ].filter( Boolean ).join( '.' )
                }

                const pathFromKey = ( key: string ) => pathToString( {
                    dbName: db.name,
                    storeName: name,
                    key,
                    ext: getExeCtx() == 'node' ? 'json' : undefined,
                } )

                return {
                    name,
                    set ( key, input ) {
                        const path = pathFromKey( key )
                        const parsed = schema.safeParse( input )
                        if ( parsed.success ) {
                            localStorage.setItem(
                                path,
                                stringify( parsed.data )
                            )
                        }
                        return parsed
                    },
                    get ( key ) {
                        const path = pathFromKey( key )
                        const persistedValue = localStorage.getItem( path )
                        const value = persistedValue == 'undefined' ? null : persistedValue
                        const parsed = schema.safeParse( safeParseJSON( value ?? 'null' ) )
                        return parsed
                    },
                    remove ( key: string ) {
                        const path = pathFromKey( key )
                        localStorage.removeItem( path )
                    },
                }
            }
        }

        return db
    }

}

function safeParseJSON ( data: string ) {
    try {
        return JSON.parse( data )
    } catch ( error ) {
        return data
    }
}

// function filter ( cb: ( key: string, data: unknown ) => boolean ) {
//     return Array.from( getAllItems() ).filter( ( [ key, data ] ) => cb( key, data ) )
// }

// function getAllItems () {
//     const map = new Map<string, unknown>()
//     for ( let i = 0; i < localStorage.length; i++ ) {
//         const key = localStorage.key( i )
//         const data = key ? LocalKV.getItem( key ) : undefined
//         if ( key && data ) map.set( key, data )
//     }
//     return map
// }