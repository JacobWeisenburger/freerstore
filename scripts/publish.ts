console.log( 'Publishing...' )

Deno.chdir( 'dist' )
console.log( Deno.cwd() )

try {
    const command = new Deno.Command( 'cmd', { args: [ '/c', 'npm publish' ] } )
    const { stdout, stderr } = await command.output()
    console.log( new TextDecoder().decode( stdout ) )
    throw new Error( new TextDecoder().decode( stderr ) )
} catch ( error ) {
    console.group( 'Error:' )
    console.log( error )
    console.groupEnd()
}
console.log( 'npm publish: ran' )

console.log( 'Publish: done' )