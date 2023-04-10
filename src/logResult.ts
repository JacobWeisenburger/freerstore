import { z } from 'zod'

export function logResult ( result: z.SafeParseReturnType<any, any> ) {
    const { success } = result
    success
        ? console.log( { data: result.data } )
        : console.log( { issues: result.error.issues } )
}