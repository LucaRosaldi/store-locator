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

    i18n: {
      searchHint: '',
      currentLocation: 'Current Location',
      directions: 'Directions',
      call: 'Call',
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
    findUserLocation: false,

    marker: null,

    style: [],

    unitSystem: 'METRIC',
    travelMode: 'DRIVING',

    zoom: 6,
    zoomSelection: 17,

    showStoreDistance: true,
    nearestStores: 6,
    farStoresOpacity: 0.65,

    showTerrainControl: false,
    showStreetViewControl: false,
    showFullscreenControl: false

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
      fullscreenControl: this.props.showFullscreenControl
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
        this.map.setZoom( this.props.zoom );
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

    let content = ``;
    content += `<div class="${ classNames.infowindow }">`;
    content += `<p class="${ classNames.store_name }">${ store.name }</p>`;
    content += `<address class="${ classNames.store_address }">${ store.address }</address>`;
    if ( store.description ) content += `<p class="${ classNames.store_description }">${ store.description }</p>`;
    content += `</div>`;

    marker.infoWindow = new google.maps.InfoWindow( { content: content } );
    marker.storeItem = document.getElementById( `store-${ store.id }` );

    marker.addListener( 'click', () => {
      if ( this.infoWindow ) this.infoWindow.close();
      this.infoWindow = marker.infoWindow;
      this.infoWindow.open( this.map, marker );
      this.setState( { activeStoreId: store.id } );
      marker.storeItem.scrollIntoView();
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

    const { stores, mapStoreLimit } = this.props;
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
        store.hidden = i + 1 > mapStoreLimit;
        const marker = this.addStoreMarker( store );
        if ( store.hidden ) {
          marker.setOpacity( this.props.farStoresOpacity );
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

      if ( ! place.geometry ) return;

      // If the place has a geometry, then present it on a map.
      if ( place.geometry.viewport ) {
        this.map.fitBounds( place.geometry.viewport );
      } else {
        this.map.setCenter( place.geometry.location );
        this.map.setZoom( this.props.zoom );
      }

      const location = place.geometry.location.toJSON();
      this.setState( { searchLocation: location } );
      this.setHomeMarker( location );
      this.calculateDistanceFrom( location );

    });
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
      <div className={ cx( classNames.container, {
        [ classNames.fullwidth ]: fullwidth,
        [ classNames.hidedistance ]: ! showStoreDistance,
        [ classNames.storeselected ]: activeStoreId !== null
      }) }>
        <div className={ classNames.map } ref={ ( mapFrame ) => ( this.mapFrame = mapFrame ) } />
        <div className={ classNames.stores }>
          <div className={ classNames.stores_container }>
            <div className={ classNames.stores_search }>
              <div className={ classNames.stores_input }>
                <input id={ classNames.searchIcon } type="text" ref={ ( input ) => ( this.input = input ) } />
                <label for={ classNames.searchIcon }></label>
              </div>
            </div>
            { this.props.i18n.searchHint && <div className={ classNames.stores_hint }>{ this.props.i18n.searchHint }</div> }
            <ul className={ classNames.stores_list }>
              { stores.map( ( store ) => {
                return (
                  <li
                    id={ `store-${ store.id }` }
                    key={ store.id }
                    onClick={ () => this.onStoreClick( store ) }
                    className={ cx({
                      [classNames.activeStore]: store.id === activeStoreId,
                      [classNames.hiddenStore]: store.hidden
                    }) }>
                    <p className={ classNames.store_name }>{ store.name }</p>
                    { this.props.showStoreDistance && store.distanceText && (
                      <div className={ classNames.store_distance }>
                        { store.distanceText }{ ' ' }
                        { store.durationText && `(${store.durationText})` }
                      </div>
                    )}
                    <address className={ classNames.store_address }>{ store.address }</address>
                    <div className={ classNames.storeActions } onClick={ ( e ) => e.stopPropagation() }>
                      <a target="_blank" href={ `${ this.getDirectionsUrl( searchLocation, store.location ) }` }>
                        <span className={ `${ classNames.store_actions_icon } ${ classNames.store_actions_directions }` }></span>
                        <span>{ this.props.i18n.directions }</span>
                      </a>{' '}
                      { store.phone && (
                        <a target="_blank" href={ `tel:${store.phone}` }>
                          <span className={ `${ classNames.store_actions_icon } ${ classNames.store_actions_phone }` }></span>
                          <span>{ this.props.i18n.call }</span>
                        </a>
                      ) }
                      { store.website && (
                        <a target="_blank" href={ store.website }>
                          <span className={ `${ classNames.store_actions_icon } ${ classNames.store_actions_website }` }></span>
                          <span>{ this.props.i18n.website }</span>
                        </a>
                      ) }
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    );
  }
}

export default StoreLocator;
