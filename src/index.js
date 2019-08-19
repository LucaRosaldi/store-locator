import {render} from 'preact';
import StoreLocator from 'components/store-locator';

module.exports = function( { container, stores, ...config } ) {
  const storesWithIds = stores.map( ( store, i ) => {
    store.id = i;
    return store;
  });
  render( <StoreLocator { ...config } stores={ storesWithIds } />, container );
  return StoreLocator;
};
