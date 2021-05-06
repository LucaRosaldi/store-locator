/**
 * Check if passed argument is a callable function.
 *
 * @param  {Callable} func
 * @return {Boolean}
 */
export function isFunction( func ) {
  return func && {}.toString.call( func ) === '[object Function]';
}

/**
 * Get the user location.
 *
 * @return {object} Location object literal
 */
export function getUserLocation() {
  return new Promise( ( resolve, reject ) => {
    if ( ! navigator.geolocation ) return reject( 'no geolocation support' );
    navigator.geolocation.getCurrentPosition(
      p => {
        resolve({
          lat: p.coords.latitude,
          lng: p.coords.longitude
        });
      },
      () => {
        reject( 'user denied request for position' );
      }
    );
  });
}

/**
 * Inject a script in the page asynchronously.
 *
 * @param  {string} src
 * @return {void}
 */
export function loadScript( src ) {
  return new Promise( ( resolve, reject ) => {
    let s, r, t;
    r = false;
    s = document.createElement( 'script' );
    s.type = 'text/javascript';
    s.src = src;
    s.onload = s.onreadystatechange = function() {
      if ( !r && ( !this.readyState || this.readyState === 'complete' ) ) {
        r = true;
        return resolve();
      }
      return reject();
    };
    t = document.getElementsByTagName( 'script' )[0];
    t.parentNode.insertBefore( s, t );
  });
}

/**
 * Sanitize a string.
 *
 * @param  {String} str
 * @return {String}
 */
export function sanitizeString( str ) {
  var element = document.createElement( 'div' );

  function decodeHTMLEntities( str ) {
    if( str && typeof str === 'string' ) {
      str = str.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '');
      str = str.replace(/<\/?\w(?:[^"'>]|"[^"]*"|'[^']*')*>/gmi, '');
      element.innerHTML = str;
      str = element.textContent;
      element.textContent = '';
    }
    return str;
  }

  return decodeHTMLEntities( str );
}

export default function() {
  return {
    isFunction: isFunction
  }
}
