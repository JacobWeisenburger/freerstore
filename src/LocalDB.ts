import localforage from 'localforage'
import { z } from 'zod'

// https://localforage.github.io/localForage/

export module LocalDB {

    export type DB = {
        name: string
        collection<Schema extends z.Schema> (
            name: string,
            schema: Schema,
        ): Collection<z.input<Schema>, z.output<Schema>>
    }

    export type Collection<Input, Output> = {
        name: string
        set ( key: string, input: Input ): Promise<z.SafeParseReturnType<Input, Output>>
        get ( key: string ): Promise<z.SafeParseReturnType<Input, Output>>
    }

    export function db ( name: string ) {
        const db: DB = {
            name,
            collection<Schema extends z.Schema> (
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
                }
            }
        }

        return db
    }

}