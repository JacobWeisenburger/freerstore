import { getExeCtx } from './getExeCtx.js'

export function stringify ( data: any ) {
    // return JSON.stringify( data )
    return JSON.stringify( data, null, getExeCtx() == 'browser' ? 0 : 4 )
}