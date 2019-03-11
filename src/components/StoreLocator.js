/*-----------------------------------------------------------------------------*
 *  STORE LOCATOR
 *-----------------------------------------------------------------------------*
 *
 *  Responsive Google Maps Store locator build in Preact featuring interactive
 *  stores list, user geolocation, search box with autocomplete, custom map
 *  styles, custom markers and internationalization.
 *
 *  Forked and improved from https://github.com/microapps/store-locator
 *
 *  @author Luca Rosaldi
 *
 */

import promiseMap from 'p-map';
import cx from 'classnames';
import {getUserLocation, loadScript} from 'lib/utils';
import {Component} from 'preact';
import classNames from './StoreLocator.css';

/**
 * @type {Object} Unit of measure for calculating distance.
 */
const UNITS = {
  METRIC: 0,
  IMPERIAL: 1
};

/**
 * @type {Float} Number for converting Kilometers in Miles.
 */
const KM_TO_MILES = 1.609;

/**
 * @type {StoreLocator} Store Locator Component.
 */
class StoreLocator extends Component {

  /**
   * Store Locator options.
   *
   * @see README for the list and description of all available options.
   *
   * @type {Object}
   */
  static defaultProps = {

    stores: [],

    searchHint: '',

    i18n: {
      currentLocation: 'Current Location',
      directions: 'Directions',
      phone: 'Call',
      email: 'Message',
      website: 'Website',
      distance: '{distance}',
      byCar: 'by car',
      byWalk: 'by walk',
    },

    fullwidth: false,

    center: {
      lat: 41.9102415,
      lng: 12.3959168
    },
    address: '',
    findUserLocation: true,

    marker: null,

    style: [],

    unitSystem: 'METRIC',
    travelMode: 'DRIVING',

    zoom: 6,
    zoomSelection: 17,

    showStoreDistance: true,
    nearestStores: 1,
    fartherStoresOpacity: 1.00,

    showStreetViewControl: true,
    showTerrainControl: false

  };

  /**
   * Object constructor.
   *
   * @return {void}
   */
  constructor( props ) {
    super( props );
    this.state = {
      searchLocation: null,
      activeStoreId: null,
      stores: props.stores
    };
    this.markers = [];
  }

  /**
   * Inject the map script.
   *
   * @return {void}
   */
  loadGoogleMaps() {
    if ( window.google && window.google.maps ) return Promise.resolve();
    return loadScript(
      `https://maps.googleapis.com/maps/api/js?key=${this.props.apiKey}&libraries=geometry,places`
    );
  }

  /**
   * Initialize map.
   *
   * @return {void}
   */
  setupMap = () => {

    this.map = new window.google.maps.Map( this.mapFrame, {
      center: this.props.center.lat && this.props.center,
      zoom: this.props.zoom,
      styles: this.props.style,
      mapTypeControl: this.props.showTerrainControl,
      streetViewControl: this.props.showStreetViewControl,
      fullscreenControl: false
    });

    this.distanceService = new google.maps.DistanceMatrixService();
    this.setupAutocomplete();
    this.state.stores.map( this.addStoreMarker );

    if ( this.props.findUserLocation ) {
      getUserLocation()
        .then( ( location ) => this.setLocation( location ) )
        .catch( ( error ) => this.setInitialAddress() );
      return;
    }

    this.setInitialAddress();
  }

  /**
   * Set the address passed in the props.
   *
   * @return {void}
   */
  setInitialAddress() {
    if ( this.props.address ) this.setLocation( this.props.address );
  }

  /**
   * Set a location on the map.
   *
   * @param  {String|Object} Address string or Location literal
   * @return {void}
   */
  setLocation( location ) {
    let request;

    if ( typeof location === 'string' ) {
      request = { address: location };
    } else if ( typeof location === 'object' )  {
      request = { location: location };
    } else {
      return;
    }

    const geocoder = new google.maps.Geocoder();

    geocoder.geocode( request, ( results, status ) => {
      if ( status === 'OK' && results[0] ) {

        const address = results[0].formatted_address;
        const loc = {
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng()
        };

        this.input.value = address;
        this.setState( { searchLocation: loc } );

        this.calculateDistanceFrom( loc );

        this.map.setCenter( loc );
        this.setHomeMarker( loc );
      }
    });
  }

  /**
   * Set marker for current location.
   *
   * @param {Object} location { lat: x, lng: y }
   */
  setHomeMarker( location ) {

    if ( this.homeMarker ) {
      this.homeMarker.setMap( null );
    }

    this.homeMarker = new google.maps.Marker({
      position: location,
      title: this.props.i18n.currentLocation,
      map: this.map,
      icon: {
        url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABHNCSVQICAgIfAhkiAAAAF96VFh0UmF3IHByb2ZpbGUgdHlwZSBBUFAxAABo3uNKT81LLcpMVigoyk/LzEnlUgADYxMuE0sTS6NEAwMDCwMIMDQwMDYEkkZAtjlUKNEABZgamFmaGZsZmgMxiM8FAEi2FMnxHlGkAAADqElEQVRo3t1aTWgTQRQOiuDPQfHs38GDogc1BwVtQxM9xIMexIN4EWw9iAehuQdq0zb+IYhglFovClXQU+uhIuqh3hQll3iwpyjG38Zkt5uffc4XnHaSbpLZ3dnEZOBB2H3z3jeZN+9vx+fzYPgTtCoQpdVHrtA6EH7jme+/HFFawQBu6BnWNwdGjB2BWH5P32jeb0V4B54KL5uDuW3D7Y/S2uCwvrUR4GaEuZABWS0FHhhd2O4UdN3FMJneLoRtN7Y+GMvvUw2eE2RDh3LTOnCd1vQN5XZ5BXwZMV3QqQT84TFa3zuU39sy8P8IOqHb3T8fpY1emoyMSQGDI/Bwc+0ELy6i4nLtepp2mE0jc5L3UAhMsdxut0rPJfRDN2eMY1enF8Inbmj7XbtZhunkI1rZFD/cmFMlr1PFi1/nzSdGkT5RzcAzvAOPU/kVF9s0ujqw+9mP5QgDmCbJAV7McXIeGpqS3Qg7OVs4lTfMD1Yg9QLR518mZbImFcvWC8FcyLAbsev++3YETb0tn2XAvouAvjGwd14YdCahUTCWW6QQIzzDO/CIAzKm3pf77ei23AUkVbICHr8pnDZNynMQJfYPT7wyKBzPVQG3IvCAtyTsCmRBprQpMawWnkc+q2Rbn+TK/+gmRR7qTYHXEuZkdVM0p6SdLLYqX0LItnFgBxe3v0R04b5mGzwnzIUMPiBbFkdVmhGIa5tkJ4reZvyl4Rg8p3tMBh+FEqUduVRUSTKTnieL58UDG76cc70AyMgIBxs6pMyIYV5agKT9f/ltTnJFOIhuwXOCLD6gQ/oc8AJcdtuYb09xRQN3NWULgCwhfqSk3SkaBZViRTK3EYNUSBF4Hic0Y8mM+if0HhlMlaIHbQ8Z5lszxnGuIP2zrAw8J8jkA7pkMAG79AKuPTOOcgWZeVP5AsSDjAxWegGyJoSUWAj/FBpRa0JiviSbfldMqOMPcce7UVeBLK4gkMVVBLI2phLjKlIJm8lcxMNkLuIomXOTTmc1kwYf2E+nMQdzlaTTKgoaZJWyBQ141RY0DkrK6XflAQbih1geZnhJeXu5WeEZ3mVqSkrIgCzXJaXqoh65TUuLerdtFXgQ2bYKeD1pq6hobLE86SlztXMWvaA5vPO0sYWB9p2K1iJS4ra0Fju/udsN7fWu+MDRFZ+YuuIjX1d8Zu2OD92WC9G3ub1qABktBV7vssfBMX1L7yVjZ7PLHuABb9svezS7boNDyK/b4LdX123+Au+jOmNxrkG0AAAAAElFTkSuQmCC',
        scaledSize: new google.maps.Size( 24, 24 )
      }
    });

    this.homeMarker.infoWindow = new google.maps.InfoWindow({
      content: this.props.i18n.currentLocation
    });

    this.homeMarker.addListener( 'click', () => {
      if ( this.infoWindow ) this.infoWindow.close();
      this.infoWindow = this.homeMarker.infoWindow;
      this.infoWindow.open( this.map, this.homeMarker );
    });

  }

  /**
   * Add Marker for a store.
   *
   * @param  {Object}             store
   * @return {google.maps.Marker}
   */
  addStoreMarker = ( store ) => {

    const icon = store.marker || this.props.marker || {
      url: 'https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi2.png',
      size: [ 20, 32 ]
    };

    const marker = new google.maps.Marker({
      position: store.location,
      title: store.name,
      map: this.map,
      icon: icon && icon.url && icon.size && {
        url: icon.url,
        scaledSize: new google.maps.Size( icon.size[0], icon.size[1] )
      }
    });

    const infowindow = document.createElement( 'div' );
    infowindow.className = 'store-locator_store';

    let content = ``;

    // text content
    content += `<div class="store-locator_store_text">`;
    content += `<h1 class="store-locator_store_name">${ store.name }</h1>`;
    content += `<address class="store-locator_store_address">${ store.address }</address>`;
    if ( store.description ) content += `<p class="store-locator_store_description">${ store.description }</p>`;
    content += `</div>`;

    // thumbnail
    if ( store.thumbnail ) {
      infowindow.className += ' has-thumbnail';
      content += `<figure class="store-locator_store_thumbnail"><img src="${ store.thumbnail }"></figure>`;
    }

    infowindow.innerHTML = content;

    marker.infoWindow = new google.maps.InfoWindow({
      content: infowindow.outerHTML
    });

    marker.storeItem = document.getElementById( `store-${ store.id }` );

    marker.addListener( 'click', () => {
      if ( this.infoWindow ) this.infoWindow.close();
      this.infoWindow = marker.infoWindow;
      this.infoWindow.open( this.map, marker );
      this.setState( { activeStoreId: store.id } );

      // scroll the store list to show the active item
      marker.storeItem.parentElement.scrollTop = marker.storeItem.offsetTop - this.navHeader.offsetHeight;
    });

    this.markers[ store.id ] = marker;
    return marker;
  }

  /**
   * Handle clicks on stores list.
   *
   * @return {void}
   */
  onStoreClick( { location, id } ) {
    const marker = this.markers[ id ];

    this.map.setCenter( location );
    this.map.setZoom( this.props.zoomSelection );

    if ( this.infoWindow ) this.infoWindow.close();
    this.infoWindow = marker.infoWindow;
    this.infoWindow.open( this.map, this.markers[ id ] );

    this.setState( { activeStoreId: id } );
  }

  /**
   * Clear all markers on map.
   *
   * @return {void}
   */
  clearMarkers() {
    this.markers.forEach( ( m ) => {
      m.setMap( null );
    });
    this.markers = [];
  }

  /**
   * Get oject representation of distance between two points in the map.
   *
   * @param  {Object} p1 Coordinates { lat: x, lng: y }
   * @param  {Object} p2 Coordinates { lat: x, lng: y }
   * @return {Object}                { distance: a, distanceText: b, durationText: c }
   */
  getDistance( p1, p2 ) {

    const origin = new google.maps.LatLng( p1 );
    const destination = new google.maps.LatLng( p2 );
    const directDistance = this.getDirectDistance(origin, destination);

    return new Promise( resolve => {
      this.distanceService.getDistanceMatrix(

        {
          origins: [origin],
          destinations: [destination],
          travelMode: this.props.travelMode,
          unitSystem: UNITS[ this.props.unitSystem ],
          durationInTraffic: true,
          avoidHighways: false,
          avoidTolls: false
        },

        ( response, status ) => {

          if ( status !== 'OK' ) return resolve( directDistance );

          const route = response.rows[0].elements[0];

          if (route.status !== 'OK') return resolve( directDistance );

          const i18nProp = ( this.props.travelMode === 'DRIVING' ) ? 'byCar' : 'byWalk';
          const distanceText = this.props.i18n.distance.replace( '{distance}', route.distance.text );
          const durationText = `${route.duration.text} ${this.props.i18n[ i18nProp ]}`;

          resolve({
            distance: route.distance.value,
            distanceText: this.props.i18n.distance.replace( '{distance}', route.distance.text ),
            durationText: durationText
          });

        }
      );
    });
  }

  /**
   * Get oject representation of direct distance between two Google LatLng points.
   *
   * @param  {google.maps.LatLng} origin
   * @param  {google.maps.LatLng} destination
   * @return {Object}                         { distance: a, distanceText: b }
   */
  getDirectDistance( origin, destination ) {

    let distance =
      ( google.maps.geometry.spherical.computeDistanceBetween( origin, destination ) / 1000 ).toFixed(2);
    let distanceText = `${distance} Km`;

    if ( UNITS[ this.props.unitSystem ] === 1 ) {
      distance = ( distance / KM_TO_MILES ).toFixed(2);
      distanceText = `${distance} Mi`;
    }

    return {
      distance,
      distanceText: distanceText
    };
  }

  /**
   * Get Google Maps URL for getting directions.
   *
   * @param  {Object} fromPoint Coordinates of starting point { lat: x, lng: y }
   * @param  {Object} toPoint   Coordinates of destination { lat: x, lng: y }
   * @return {String}
   */
  getDirectionsUrl( fromPoint, toPoint ) {
    const query = {};

    if ( fromPoint ) {
      query.saddr = `@${ fromPoint.lat },${ fromPoint.lng }`;
    }
    if ( toPoint ) {
      query.daddr = `@${ toPoint.lat },${ toPoint.lng }`;
    }

    const queryString = Object.keys( query ).map( ( key ) => key + '=' + query[ key ] ).join( '&' );
    return `https://www.google.com/maps?${ queryString }`;
  }

  /**
   * Calculate distance between a given location and stores.
   *
   * @param  {Object} location Coordinates { lat: x, lng: y }
   * @return {void}
   */
  calculateDistanceFrom( location ) {

    const { stores, nearestStores } = this.props;
    if ( ! location ) return stores;

    promiseMap( stores, ( store ) => {
      return this.getDistance( location, store.location ).then( ( result ) => {
        Object.assign( store, result );
        return store;
      });
    }).then( ( data ) => {

      let result = data.sort( ( a, b ) => a.distance - b.distance );

      const bounds = new google.maps.LatLngBounds();
      bounds.extend( location );

      this.clearMarkers();

      result = result.map( ( store, i ) => {
        store.hidden = i + 1 > nearestStores;
        const marker = this.addStoreMarker( store );
        if ( store.hidden ) {
          marker.setOpacity( this.props.fartherStoresOpacity );
        } else {
          bounds.extend( store.location );
        }
        return store;
      });

      this.map.fitBounds( bounds );
      this.map.setCenter( bounds.getCenter(), this.map.getZoom() - 1 );
      this.setState( { stores: result } );

    });

  }

  /**
   * Initialize autocomplete feature.
   *
   * @return {void}
   */
  setupAutocomplete() {

    const autocomplete = new google.maps.places.Autocomplete( this.input );

    autocomplete.bindTo( 'bounds', this.map );
    autocomplete.addListener( 'place_changed', () => {

      const place = autocomplete.getPlace();

      // If the place was not selected with autocomplete, reset the input.
      if ( ! place.geometry ) {
        this.input.value = '';
        return;
      };

      const location = place.geometry.location.toJSON();

      // If the place has a geometry, then present it on a map.
      if ( place.geometry.viewport ) {
        this.map.fitBounds( place.geometry.viewport );
      } else {
        this.map.setCenter( place.geometry.location );
      }

      // If the place is specific (not city or country), calculate the distance.
      if ( place.types.indexOf( 'political' ) === -1 ) {
        this.calculateDistanceFrom( location );
      }

      this.setState( { searchLocation: location } );
      this.setHomeMarker( location );

    });
  }

  /**
   * Decode an encoded email address.
   *
   * @param  {String} email
   * @return {String}
   */
  sanitizeString( str ) {
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

  /**
   * Initialize the component.
   *
   * @return {void}
   */
  componentDidMount() {
    this.loadGoogleMaps().then( this.setupMap );
  }

  //noinspection JSCheckFunctionSignatures
  render( { fullwidth, showStoreDistance }, { stores, activeStoreId, searchLocation } ) {
    return (
      <div className={ cx( 'store-locator', {
        [ 'fullwidth' ]: fullwidth,
        [ 'distance-is-hidden' ]: ! showStoreDistance,
        [ 'store-is-selected' ]: activeStoreId !== null
      }) }>

        <div className='store-locator_map' ref={ ( mapFrame ) => ( this.mapFrame = mapFrame ) } />

        <nav className='store-locator_nav' role='navigation'>
          <div className='store-locator_nav_container'>

            <header className='store-locator_nav_header'
              ref={ ( navHeader ) => ( this.navHeader = navHeader ) }>

              <div className='store-locator_search'>
                <input type="search"
                  id='store-locator-search'
                  ref={ ( input ) => ( this.input = input ) } />
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/></svg>
              </div>

              { this.props.searchHint &&
              <div className='store-locator_search_hint'>{ this.props.searchHint }</div>
              }

            </header>

            <ul className='store-locator_list'>
              { stores.map( ( store ) => {
                return (
                  <li
                    id={ `store-${ store.id }` }
                    key={ store.id }
                    onClick={ () => this.onStoreClick( store ) }>

                    <div className={ cx( 'store-locator_store', {
                      [ 'is-selected' ]: store.id === activeStoreId,
                      [ 'is-hidden' ]: store.hidden
                    }) }>

                      <div className='store-locator_store_text'>

                        <h1 className='store-locator_store_name'>{ store.name }</h1>

                        { this.props.showStoreDistance && store.distanceText &&
                        <small className='store-locator_store_distance'>{ store.distanceText } { store.durationText && `(${store.durationText})` }</small>
                        }

                        <address className='store-locator_store_address'>{ store.address }</address>

                        { store.summary &&
                        <p className='store-locator_store_description'>{ store.summary }</p>
                        }

                        <footer className='store-locator_store_actions'>

                          <a href={ `${ this.getDirectionsUrl( searchLocation, store.location ) }` }
                            className='store-locator_store_directions'
                            target="_blank">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21.71 11.29l-9-9c-.39-.39-1.02-.39-1.41 0l-9 9c-.39.39-.39 1.02 0 1.41l9 9c.39.39 1.02.39 1.41 0l9-9c.39-.38.39-1.01 0-1.41zM14 14.5V12h-4v3H8v-4c0-.55.45-1 1-1h5V7.5l3.5 3.5-3.5 3.5z" fill="currentColor"/></svg>
                            <span>{ this.props.i18n.directions }</span>
                          </a>

                          { store.phone &&
                          <a href={ `tel:${store.phone}` }
                            className='store-locator_store_phone'
                            target="_blank">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" fill="currentColor"/></svg>
                            <span>{ this.props.i18n.phone }</span>
                          </a>
                          }

                          { store.email &&
                          <a href={ `mailto:${ this.sanitizeString( store.email )}` }
                            className='store-locator_store_email'
                            target="_blank">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="currentColor"/></svg>
                            <span>{ this.props.i18n.email }</span>
                          </a>
                          }

                          { store.website &&
                          <a href={ store.website }
                            className='store-locator_store_website'
                            target="_blank">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z" fill="currentColor"/></svg>
                            <span>{ this.props.i18n.website }</span>
                          </a>
                          }

                        </footer>

                      </div>

                      { store.thumbnail &&
                      <figure className='store-locator_store_thumbnail'>
                        <img src={ store.thumbnail } />
                      </figure>
                      }

                    </div>
                  </li>
                );
              })}
            </ul>

          </div>
        </nav>

      </div>
    );
  }
}

export default StoreLocator;
