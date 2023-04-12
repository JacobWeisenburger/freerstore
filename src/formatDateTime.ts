export function formatDateTime ( date: Date ) {
    const dateTimeNoMS = Intl.DateTimeFormat( 'en', {
        dateStyle: 'short',
        timeStyle: 'medium',
    } ).format( date ).replace( ',', '' )
    const AMPM = dateTimeNoMS.match( /AM|PM/ )?.[ 0 ]
    const dateTimeNoMSNoAMPM = AMPM
        ? dateTimeNoMS.replace( ` ${ AMPM }`, '' )
        : dateTimeNoMS
    const ms = date.getMilliseconds().toString().padStart( 3, '0' )
    return `${ dateTimeNoMSNoAMPM }.${ ms } ${ AMPM }`
}