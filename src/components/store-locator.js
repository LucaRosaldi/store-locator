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
import {isFunction, getUserLocation, loadScript, sanitizeString} from 'lib/utils';
import {Component} from 'preact';
import classNames from './store-locator.css';

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
    filters: [],

    searchHint: '',
    searchRadius: 30,
    showStoreDistance: true,
    orderByStoreDistance: true,

    i18n: {
      byCar: 'by car',
      byWalk: 'by walk',
      callPhoneNumber: 'Call phone number',
      distanceText: '{{distance}}',
      filtersHeaderText: 'Show:',
      getDirections: 'Get directions',
      noResults: 'There are no results in the selected area',
      openWebsite: 'Open website',
      sendEmail: 'Send email',
      showPosition: 'Show your position',
      yourPosition: 'Your position',
    },

    mapAddress: '',
    mapCenter: {
      lat: 41.9102415,
      lng: 12.3959168
    },
    mapFullWidth: false,
    mapMarkerIcon: null,
    mapStreetViewControl: true,
    mapStyle: [],
    mapTerrainControl: false,
    mapTravelMode: 'DRIVING',
    mapUnitSystem: 'METRIC',
    mapZoom: 6,

    onMapInit: function( map ){},
    onPlaceChange: function( place ){}

  };

  /**
   * Object constructor.
   *
   * @return {void}
   */
  constructor( props ) {
    super( props );

    // assign a immutable id to each store
    props.stores.map( ( store ) => {
      store.storeId = store.id
    });

    // get all filters tags as an array
    const activeFilters = props.filters.map( ( filter ) => {
      return filter.tag;
    });

    this.state = {
      activeStoreId: null,
      activeFilters: activeFilters,
      searchLocation: null,
      searchRadius: props.searchRadius,
      showStoreDistance: props.showStoreDistance,
      stores: props.stores
    };
    this.markers = [];
  }

  /**
   * Initialize the component.
   *
   * @return {void}
   */
  componentDidMount() {
    this.loadGoogleMaps().then( this.initMap );
  }

  /**
   * Add marker to the map which displays the current position.
   *
   * @param {Object} location { lat: x, lng: y }
   */
  addCurrentPositionMarker( location ) {
    this.clearCurrentPositionMarker();

    this.currentPositionMarker = new google.maps.Marker({
      position: location,
      title: this.props.i18n.yourPosition,
      map: this.map,
      icon: {
        url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABHNCSVQICAgIfAhkiAAAAF96VFh0UmF3IHByb2ZpbGUgdHlwZSBBUFAxAABo3uNKT81LLcpMVigoyk/LzEnlUgADYxMuE0sTS6NEAwMDCwMIMDQwMDYEkkZAtjlUKNEABZgamFmaGZsZmgMxiM8FAEi2FMnxHlGkAAADqElEQVRo3t1aTWgTQRQOiuDPQfHs38GDogc1BwVtQxM9xIMexIN4EWw9iAehuQdq0zb+IYhglFovClXQU+uhIuqh3hQll3iwpyjG38Zkt5uffc4XnHaSbpLZ3dnEZOBB2H3z3jeZN+9vx+fzYPgTtCoQpdVHrtA6EH7jme+/HFFawQBu6BnWNwdGjB2BWH5P32jeb0V4B54KL5uDuW3D7Y/S2uCwvrUR4GaEuZABWS0FHhhd2O4UdN3FMJneLoRtN7Y+GMvvUw2eE2RDh3LTOnCd1vQN5XZ5BXwZMV3QqQT84TFa3zuU39sy8P8IOqHb3T8fpY1emoyMSQGDI/Bwc+0ELy6i4nLtepp2mE0jc5L3UAhMsdxut0rPJfRDN2eMY1enF8Inbmj7XbtZhunkI1rZFD/cmFMlr1PFi1/nzSdGkT5RzcAzvAOPU/kVF9s0ujqw+9mP5QgDmCbJAV7McXIeGpqS3Qg7OVs4lTfMD1Yg9QLR518mZbImFcvWC8FcyLAbsev++3YETb0tn2XAvouAvjGwd14YdCahUTCWW6QQIzzDO/CIAzKm3pf77ei23AUkVbICHr8pnDZNynMQJfYPT7wyKBzPVQG3IvCAtyTsCmRBprQpMawWnkc+q2Rbn+TK/+gmRR7qTYHXEuZkdVM0p6SdLLYqX0LItnFgBxe3v0R04b5mGzwnzIUMPiBbFkdVmhGIa5tkJ4reZvyl4Rg8p3tMBh+FEqUduVRUSTKTnieL58UDG76cc70AyMgIBxs6pMyIYV5agKT9f/ltTnJFOIhuwXOCLD6gQ/oc8AJcdtuYb09xRQN3NWULgCwhfqSk3SkaBZViRTK3EYNUSBF4Hic0Y8mM+if0HhlMlaIHbQ8Z5lszxnGuIP2zrAw8J8jkA7pkMAG79AKuPTOOcgWZeVP5AsSDjAxWegGyJoSUWAj/FBpRa0JiviSbfldMqOMPcce7UVeBLK4gkMVVBLI2phLjKlIJm8lcxMNkLuIomXOTTmc1kwYf2E+nMQdzlaTTKgoaZJWyBQ141RY0DkrK6XflAQbih1geZnhJeXu5WeEZ3mVqSkrIgCzXJaXqoh65TUuLerdtFXgQ2bYKeD1pq6hobLE86SlztXMWvaA5vPO0sYWB9p2K1iJS4ra0Fju/udsN7fWu+MDRFZ+YuuIjX1d8Zu2OD92WC9G3ub1qABktBV7vssfBMX1L7yVjZ7PLHuABb9svezS7boNDyK/b4LdX123+Au+jOmNxrkG0AAAAAElFTkSuQmCC',
        scaledSize: new google.maps.Size( 24, 24 )
      }
    });

    this.currentPositionMarker.infoWindow = new google.maps.InfoWindow({
      content: this.props.i18n.yourPosition
    });

    this.currentPositionMarker.addListener( 'click', () => {
      this.closeInfoWindows();
      this.infoWindow = this.currentPositionMarker.infoWindow;
      this.infoWindow.open( this.map, this.currentPositionMarker );
    });
  }

  /**
   * Add marker to the map which displays a store.
   *
   * @param  {Object}             store
   * @return {google.maps.Marker}
   */
  addStoreMarker = ( store ) => {

    // default google marker icon
    const icon = store.marker || this.props.mapMarkerIcon || {
      url: 'https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi2.png',
      size: [ 20, 32 ]
    };

    // add the marker to the map
    const marker = new google.maps.Marker({
      position: store.location,
      title: store.name,
      map: this.map,
      icon: icon && icon.url && icon.size && {
        url: icon.url,
        scaledSize: new google.maps.Size( icon.size[0], icon.size[1] )
      }
    });

    // add a reference to the store listing
    marker.storeId = store.storeId;

    // create infowindow and populate it with store data from the listing
    marker.infoWindow = new google.maps.InfoWindow({
      content: document.getElementById( `store-${ store.storeId }` ).innerHTML
    });

    // add listeners
    marker.addListener( 'click', this.handleMarkerClick.bind( this, marker ) );

    this.markers[ marker.storeId ] = marker;
    return marker;
  }

  /**
   * Clear the marker which displays the current position.
   *
   * @return {void}
   */
  clearCurrentPositionMarker() {
    if ( this.currentPositionMarker ) this.currentPositionMarker.setMap( null );
  }

  /**
   * Close all active infowindows.
   *
   * @return {void}
   */
  closeInfoWindows() {
    this.infoWindow && this.infoWindow.close();
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
   * Get distance between two points, given their location (latitude and longitude).
   *
   * @param  {Object} p1 Coordinates { lat: x, lng: y }
   * @param  {Object} p2 Coordinates { lat: x, lng: y }
   * @return {Object}                { distance: a, distanceText: b, durationText: c }
   */
  getComputedDistance( p1, p2, unit ) {

    if ( ( p1.lat == p2.lat ) && ( p1.lng == p2.lng ) ) {
      return 0;
    }

    var radlat1 = Math.PI * p1.lat / 180;
    var radlat2 = Math.PI * p2.lat / 180;
    var theta = p1.lng - p2.lng;
    var radtheta = Math.PI * theta / 180;
    var dist = Math.sin( radlat1 ) * Math.sin( radlat2 ) + Math.cos( radlat1 ) * Math.cos( radlat2 ) * Math.cos( radtheta );
    if ( dist > 1 ) {
      dist = 1;
    }
    dist = Math.acos( dist );
    dist = dist * 180 / Math.PI;
    dist = dist * 60 * 1.1515;

    if ( this.getUnitSystem() !== 'IMPERIAL' ) {
      dist = dist * KM_TO_MILES
    }

    return dist;
  }

  /**
   * Get oject representation of distance between two points in the map.
   *
   * @param  {Object} p1 Coordinates { lat: x, lng: y }
   * @param  {Object} p2 Coordinates { lat: x, lng: y }
   * @return {Object}                { distance: a, distanceText: b, durationText: c }
   */
  getDistanceMatrix( p1, p2 ) {

    const origin = new google.maps.LatLng( p1 );
    const destination = new google.maps.LatLng( p2 );
    const directDistance = this.getDirectDistance( origin, destination );

    const unitSystem = ( this.props.mapUnitSystem === 'IMPERIAL' ) ? 1 : 0;

    const getDistanceValue = this.getDistanceValue.bind( this );
    const getDistanceText = this.getDistanceText.bind( this );

    return new Promise( resolve => {
      this.distanceService.getDistanceMatrix(

        {
          origins: [origin],
          destinations: [destination],
          travelMode: this.props.mapTravelMode,
          unitSystem: unitSystem,
          durationInTraffic: true,
          avoidHighways: false,
          avoidTolls: false
        },

        ( response, status ) => {

          if ( status !== 'OK' ) return resolve( directDistance );

          const route = response.rows[0].elements[0];

          if ( route.status !== 'OK' ) return resolve( directDistance );

          const i18nProp = ( this.props.mapTravelMode === 'DRIVING' ) ? 'byCar' : 'byWalk';

          resolve({
            distance: getDistanceValue( route.distance.value ),
            distanceText: getDistanceText( route.distance.value ),
            durationText: `${route.duration.text} ${this.props.i18n[ i18nProp ]}`
          });

        }
      );
    });
  }

  /**
   * Get distance in the unit format set in props.
   *
   * @param  {int}       distance Distance in meters
   * @return {int|float}          Distance in Kilometers or Miles
   */
  getDistanceValue( distance ) {
    distance = distance / 1000;
    if ( this.getUnitSystem() === 'IMPERIAL' ) {
      distance = distance / KM_TO_MILES;
    }
    return distance.toFixed( 2 );
  }

  /**
   * Get distance text in the unit format set in props.
   *
   * @param  {int}    distance Distance in meters
   * @return {string}          Text displaying distance
   */
  getDistanceText( distance ) {
    distance = this.getDistanceValue( distance );
    const distanceText = this.props.i18n.distanceText.replace( '{{distance}}', distance );
    if ( this.getUnitSystem() === 'IMPERIAL' ) {
      return `${distanceText} Mi`;
    }
    return `${distanceText} Km`;
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

    if ( this.getUnitSystem() === 'IMPERIAL' ) {
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
   * Get the search radius in the current metrics.
   *
   * @return {[type]} [description]
   */
  getSearchRadius() {
    const radius = this.state.searchRadius;
    if ( this.getUnitSystem() === 'IMPERIAL' ) {
      return radius / KM_TO_MILES;
    }
    return radius;
  }

  /**
   * Get the current unit system ('METRIC' or 'IMPERIAL')
   *
   * @return {string}
   */
  getUnitSystem() {
    if ( this.props.mapUnitSystem.toUpperCase() === 'IMPERIAL' ) {
      return 'IMPERIAL';
    }
    return 'METRIC';
  }

  /**
   * Handle click on markers.
   *
   * @return {void}
   */
  handleMarkerClick( marker ) {

    this.setState( { activeStoreId: marker.storeId } );

    const storeItem = document.querySelector( '#store-' + marker.storeId );

    // if the marker is not visible, restore all store listings in the map
    if ( ! storeItem ) {
      this.setState( { stores: this.props.stores } );
      this.input.value = '';
    }

    // scroll the store list to show the active item
    else {
      storeItem.parentElement.scrollTop = storeItem.offsetTop - this.navHeader.offsetHeight;
    }

    // center the map on the marker
    this.map.panTo({
      lat: marker.position.lat(),
      lng: marker.position.lng()
    });

    // open the marker infowindow
    if ( this.infoWindow ) this.infoWindow.close();
    this.infoWindow = marker.infoWindow;
    this.infoWindow.open( this.map, marker );
  }

  /**
   * Handle clicks on single stores inside the stores listing.
   *
   * @return {void}
   */
  handleStoreClick( { location, id } ) {
    const marker = this.markers[ id ];

    this.map.panTo( location );

    this.closeInfoWindows();
    this.infoWindow = marker.infoWindow;
    this.infoWindow.open( this.map, this.markers[ id ] );

    this.setState( { activeStoreId: marker.storeId } );
  }

  /**
   * Handle clicks on filters.
   *
   * @return {void}
   */
  handleFilterClick( filter ) {

    this.closeInfoWindows();

    // update the active filters
    const activeFilters = this.state.activeFilters;
    const filterInput = document.querySelector( `#filter-${ filter.tag } input` );

    if ( filterInput.checked && ! activeFilters.includes( filter.tag ) ) {
      activeFilters.push( filter.tag );
    }
    else if ( ! filterInput.checked && activeFilters.includes( filter.tag ) ) {
      const i = activeFilters.indexOf( filter.tag );
      activeFilters.splice( i, 1 );
    }

    this.setState( { activeFilters: activeFilters } );

    // update the stores listing
    const results = this.state.stores.map( ( store ) => {
      let hidden = true;
      activeFilters.forEach( ( tag ) => {
        if ( store.tags.includes( tag ) ) {
          hidden = false;
        }
      });
      store.hidden = hidden;
      return store;
    });

    this.setState( { stores: results } );

    // hide/show markers for visible stores
    const visibleStoresIds = results.map( ( store ) => {
      if ( ! store.hidden ) return store.storeId;
    });

    this.markers.forEach( ( marker ) => {
      ( ! visibleStoresIds.includes( marker.storeId ) )
        ? marker.setMap( null )
        : marker.setMap( this.map );
    });
  }

  /**
   * Initialize button for getting current location.
   *
   * @return {void}
   */
  initLocationButton() {
    const button = this.locationButton;
    this.locationButton.addEventListener( 'click', ( event ) => {
      getUserLocation().then( ( coords ) => this.updateLocationByCoordinates( coords ) );
      event.preventDefault();
    });
  }

  /**
   * Initialize map.
   *
   * @return {void}
   */
  initMap = () => {

    // initialize Google Maps
    this.map = new window.google.maps.Map( this.mapFrame, {
      center: this.props.mapCenter.lat && this.props.mapCenter,
      zoom: this.props.mapZoom,
      styles: this.props.mapStyle,
      mapTypeControl: this.props.mapTerrainControl,
      streetViewControl: this.props.mapStreetViewControl,
      fullscreenControl: false
    });

    // initialize Google Maps Geocoder
    this.geocoder = new google.maps.Geocoder();

    // add map markers
    this.props.stores.map( ( store ) => this.addStoreMarker( store ) );

    // initialize search input
    this.initSearchInput();

    // initialize location button
    this.initLocationButton();

    // initialize distance matrix if needed
    if ( this.props.showStoreDistance ) {
      this.distanceService = new google.maps.DistanceMatrixService();
    }

    // set initial address if needed
    if ( this.props.mapAddress ) {
      this.updateLocationByAddress( this.props.mapAddress );
    }

    // call onMapInit hook
    if ( isFunction( this.props.onMapInit ) ) {
      this.props.onMapInit( this.map );
    }
  }

  /**
   * Initialize the search input with autocomplete feature.
   *
   * @return {void}
   */
  initSearchInput() {

    // reset map when search input is cleared
    this.input.addEventListener( 'search', () => {
      if ( this.input.value === '' ) {
        this.setState( { stores: this.props.stores } );
        this.closeInfoWindows();
        this.clearCurrentPositionMarker();
        this.map.setCenter( this.props.mapCenter );
        this.map.setZoom( this.props.mapZoom );
      }
    });

    // initialize autocomplete feature
    this.autocomplete = new google.maps.places.Autocomplete( this.input );
    this.autocomplete.bindTo( 'bounds', this.map );

    // update location when input has changed
    this.autocomplete.addListener( 'place_changed', () => {
      this.closeInfoWindows();

      const place = this.autocomplete.getPlace();

      if ( place.geometry ) {
        this.updateLocation( place );
      } else {
        this.updateLocationByAddress( place.name );
      }

      // call onPlaceChange hook
      if ( isFunction( this.props.onPlaceChange ) ) {
        this.props.onPlaceChange( place );
      }
    });
  }

  /**
   * Update the map location from a geocoded result.
   *
   * @param  {google.maps.places.PlaceResult}
   * @return {void}
   */
  updateLocation( place ) {
    const location = place.geometry.location.toJSON();

    this.input.value = place.formatted_address;
    this.setState( { searchLocation: location } );
    this.updateStores( location );

    // if place not generic, add the current position marker
    if ( place.types.indexOf( 'political' ) === -1 ) {
      this.addCurrentPositionMarker( location );
    }
    else if ( place.geometry.bounds ) {
      this.map.fitBounds( place.geometry.bounds );
    }
  }

  /**
   * Update the map location from a query string.
   *
   * @param  {Object} coords Location object literal
   * @return {void}
   */
  updateLocationByCoordinates( coords ) {
    this.geocoder.geocode( { location: coords }, ( results, status ) => {
      if ( status === 'OK' && results[0] ) this.updateLocation( results[0] );
    });
  }

  /**
   * Update the map location from a query string.
   *
   * @param  {String} address
   * @return {void}
   */
  updateLocationByAddress( address ) {
    this.geocoder.geocode( { address: address }, ( results, status ) => {
      if ( status === 'OK' && results[0] ) this.updateLocation( results[0] );
    });
  }

  /**
   * Update the map and the stores listing for a given location.
   *
   * @param  {Object} location Coordinates { lat: x, lng: y }
   * @return {void}
   */
  updateStores( coords ) {

    const bounds = new google.maps.LatLngBounds();
    bounds.extend( coords );

    // calculate stores distance
    const stores = this.props.stores.map( ( store ) => {
      store.computedDistance = this.getComputedDistance( coords, store.location, 'K' );
      return store;
    });

    // sort stores by distance
    if ( this.props.orderByStoreDistance ) {
      stores.sort( ( a, b ) => a.computedDistance - b.computedDistance );
    }

    // filter stores based on search radius
    const searchRadius = this.getSearchRadius();
    const results = stores.filter( ( store ) => store.computedDistance < searchRadius );

    // include results in the map
    results.forEach( ( store ) => bounds.extend( store.location ) );

    // adjust the map to view the filtered stores
    this.map.fitBounds( bounds );
    this.map.panTo( bounds.getCenter() );

    // update the stores listing
    this.setState( { stores: results } );

    // calculate distance with Google Distance Matrix
    if ( this.state.showStoreDistance && results.length > 0 ) {
      promiseMap( results, ( store ) => {
        return this.getDistanceMatrix( coords, store.location ).then( ( distance ) => {
          Object.assign( store, distance );
          return store;
        });
      }).then( ( stores ) => {
        this.setState( { stores: stores } );
        if ( this.props.orderByStoreDistance ) {
          stores.sort( ( a, b ) => a.distance - b.distance );
        }
      });
    }
  }

  //noinspection JSCheckFunctionSignatures
  render(
    {
      mapFullWidth,
      filters
    },
    {
    stores,
    activeStoreId,
    activeFilters,
    showStoreDistance,
    searchLocation
  }) {
    return (
      <div className={ cx( 'store-locator', {
        [ 'is-fullwidth' ]: mapFullWidth,
        [ 'no-geolocation' ]: ! navigator.geolocation,
        [ 'store-is-selected' ]: activeStoreId !== null
      }) }>

        <div className='store-locator_map' ref={ ( mapFrame ) => ( this.mapFrame = mapFrame ) } />

        { filters.length &&
        <div className='store-locator_filters'>
          <header className='store-locator_filters_header'>{ this.props.i18n.filtersHeaderText }</header>
          <ul className='store-locator_filters_list'>
            { filters.map( ( filter ) => {
              return (
                <li className='store-locator_filters_list-item'
                    id={ `filter-${ filter.tag }` }>
                  <label className='store-locator_filter'
                         key={ filter.tag }
                         onClick={ () => this.handleFilterClick( filter ) }>
                    <input type="checkbox" name={ filter.tag } defaultChecked="true"></input>
                    <span className='store-locator_filter_label'>{filter.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
        }

        <nav className='store-locator_nav' role='navigation'>
          <div className='store-locator_nav_container'>

            <header className='store-locator_nav_header'
                    ref={ ( navHeader ) => ( this.navHeader = navHeader ) }>

              <div className='store-locator_nav_search'>

                <div className='store-locator_search'>

                  <input type="search"
                         ref={ ( input ) => ( this.input = input ) } />

                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/></svg>

                </div>

                <button type='button'
                        className='store-locator_nav_button'
                        title={ this.props.i18n.showPosition }
                        ref={ ( locationButton ) => ( this.locationButton = locationButton ) }>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" fill="currentColor"/></svg>
                </button>

              </div>

              { this.props.searchHint &&
              <div className='store-locator_search_hint'>{ this.props.searchHint }</div>
              }

            </header>

            { stores.length === 0 &&
            <div className='store-locator_nav_empty'>{ this.props.i18n.noResults }</div>
            }

            <ul className='store-locator_list'>
              { stores.map( ( store ) => {
                return (
                  <li className={ cx( 'store-locator_item', {
                        [ 'is-hidden' ]: store.hidden === true
                      }) }
                      id={ `store-${ store.id }` }
                      key={ store.id }
                      onClick={ () => this.handleStoreClick( store ) }>

                    <div className={ cx( 'store-locator_store', {
                      [ 'is-selected' ]: store.id === activeStoreId
                    }) }>

                      <div className='store-locator_store_text'>

                        <h1 className='store-locator_store_name'>{ store.name }</h1>

                        { store.distanceText &&
                        <small className='store-locator_store_distance'>{ store.distanceText } { store.durationText && `(${store.durationText})` }</small>
                        }

                        { store.summary &&
                        <p className='store-locator_store_summary'>{ store.summary }</p>
                        }

                        <address className='store-locator_store_address'>{ store.address }</address>

                        { store.description &&
                        <p className='store-locator_store_description'>{ store.description }</p>
                        }

                        <footer className='store-locator_store_actions'>

                          <a href={ `${ this.getDirectionsUrl( searchLocation, store.location ) }` }
                            className='store-locator_store_directions'
                            target="_blank"
                            title={this.props.i18n.getDirections}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21.71 11.29l-9-9c-.39-.39-1.02-.39-1.41 0l-9 9c-.39.39-.39 1.02 0 1.41l9 9c.39.39 1.02.39 1.41 0l9-9c.39-.38.39-1.01 0-1.41zM14 14.5V12h-4v3H8v-4c0-.55.45-1 1-1h5V7.5l3.5 3.5-3.5 3.5z" fill="currentColor"/></svg>
                            <span>{ store.address }</span>
                          </a>

                          { store.phone &&
                          <a href={ `tel:${store.phone}` }
                            className='store-locator_store_phone'
                            target="_blank"
                            title={this.props.i18n.callPhoneNumber}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" fill="currentColor"/></svg>
                            <span>{ store.phone }</span>
                          </a>
                          }

                          { store.email &&
                          <a href={ `mailto:${sanitizeString( store.email )}` }
                            className='store-locator_store_email'
                            target="_blank"
                            title={this.props.i18n.sendEmail}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="currentColor"/></svg>
                            <span>{ sanitizeString( store.email ) }</span>
                          </a>
                          }

                          { store.website &&
                          <a href={ store.website }
                            className='store-locator_store_website'
                            target="_blank"
                            title={this.props.i18n.openWebsite}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z" fill="currentColor"/></svg>
                            <span>{ store.website }</span>
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
