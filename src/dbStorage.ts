export module dbStorage {

    export async function getDB (
        name: string,
    ) {
        const connection = indexedDB.open( name )
        return new Promise<string>( ( resolve, reject ) => {
            // return new Promise<IDBOpenDBRequest>( ( resolve, reject ) => {
            connection.onsuccess = e => {
                const db = connection.result

                // console.log( 'objectStoreNames', db.objectStoreNames )
                resolve( name )
                // resolve( connection )
                // db.close()
            }
        } )
        // console.log( indexedDB )
    }

    export async function addCollection (
        // connection: IDBOpenDBRequest,
        // db: IDBDatabase,
        name: string,
        keyPath: string | string[],
        dbName: string,
    ) {
        return new Promise<void>( ( resolve, reject ) => {
            // const connection = indexedDB.open( dbName )
            // connection.onsuccess = async e => {
            //     console.log( await indexedDB.databases() )
            //     const db = connection.result
            //     console.log( db.version )

            //     // console.log( 'objectStoreNames', db.objectStoreNames )
            //     resolve()
            //     // db.close()
            // }
            const connection = indexedDB.open( dbName )
            connection.onupgradeneeded = e => {
                const db = connection.result
                db.createObjectStore( name, { keyPath } )
                console.log( 'objectStoreNames', db.objectStoreNames )
                resolve()
            }
        } )
    }

}