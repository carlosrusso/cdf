/*!
 * Copyright 2002 - 2016 Webdetails, a Pentaho company. All rights reserved.
 *
 * This software was developed by Webdetails and is provided under the terms
 * of the Mozilla Public License, Version 2.0, or any later version. You may not use
 * this file except in compliance with the license. If you need a copy of the license,
 * please go to http://mozilla.org/MPL/2.0/. The Initial Developer is Webdetails.
 *
 * Software distributed under the Mozilla Public License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. Please refer to
 * the license for the specific language governing your rights and limitations.
 */

define([
  '../../../lib/jquery',
  '../views',
  './templates'
], function( $, views, templates ) {

  "use strict";

  /*
   * Default settings
   */
  var privateDefaults = /** @lends cdf.components.filter.configuration.defaults */ {
    Root: {
      renderers: [],
      sorters: [],
      view: {
        constructor: views.Root,
        patchViewModel: null,
        throttleTimeMilliseconds: 0,
        slots: {
          container: '.filter-root-container',
          selection: '.filter-root-selection',
          controls: '.filter-root-control .filter-control-buttons:eq(0)',
          filter: '.filter-filter-input:eq(0)',
          header: '.filter-root-header',
          footer: '.filter-root-footer',
          children: '.filter-root-items',  //container where new children will be appended
          overlay: '.filter-overlay'
        },
        childConfig: {
          withChildrenPrototype: 'Group',
          withoutChildrenPrototype: 'Item'
        },
        overlaySimulateClick: true
      }
    },
    Group: {
      renderers: [],
      sorters: [],
      view: {
        constructor: views.Group,
        patchViewModel: null,
        throttleTimeMilliseconds: 0,
        slots: {
          selection: '.filter-group-header:eq(0)', // There can be nested groups
          filter: '.filter-filter-input:eq(0)',
          children: '.filter-group-items:eq(0)'
        },
        childConfig: {
          withChildrenPrototype: 'Group',
          withoutChildrenPrototype: 'Item'
        }
      }
    },
    Item: {
      renderers: [],
      sorters: [],
      view: {
        constructor: views.Item,
        patchViewModel: null,
        throttleTimeMilliseconds: 0,
        slots: {
          selection: '.filter-item-container'
        }
      }
    }
  };

  /**
   * @class cdf.components.filter.configuration.defaults
   * @amd cdf/components/filter/configuration/defaults
   * @classdesc Filter component default values.
   * @ignore
   */
  return $.extend(true, {}, privateDefaults, /** @lends cdf.components.filter.configuration.defaults */ {

    /**
     * Configuration of the pagination.
     *
     * @type {object}
     */
    pagination: {
      throttleTimeMilliseconds: 500, // delay between
      pageSize: Infinity
    },
    /**
     * Configuration of the search.
     *
     * @type {object}
     */
    search: {
      serverSide: false,
      matcher: undefined // function(entry, fragment)
    },
    /**
     * Configuration of the selection strategy.
     *
     * @type {object}
     */
    selectionStrategy: {
      type: 'LimitedSelect',
      limit: 500
    },

    /**
     * Configuration of the Root.
     *
     * @type {object}
     */
    Root: {
      options: {
        className: 'multi-select',
        styles: [],
        showCommitButtons: true,
        showFilter: false,
        showGroupSelection: true,
        showButtonOnlyThis: false,
        showSelectedItems: false,
        showListOfSelectedItems: false,
        showNumberOfSelectedItems: true,
        showValue: false,
        showIcons: true,
        scrollThreshold: 12,
        isResizable: true,
        useOverlay: true,
        expandMode: 'absolute' // TODO: consider replacing this option with `isExpandAbsolute: true`
      },
      strings: {
        isDisabled: 'Unavailable',
        allItems: 'All',
        noItems: 'None',
        groupSelection: 'All',
        btnApply: 'Apply',
        btnCancel: 'Cancel',
        busyInfo: 'Fetching data...',
        searchPlaceholder: "Search",
        reachedSelectionLimitBefore: 'The selection limit (',
        reachedSelectionLimitAfter: ') for specific items has been reached.'

      },
      view: {
        templates: templates.Root,
        scrollbar: {
          engine: 'mCustomScrollbar',
          options: {
            theme: 'dark',
            alwaysTriggerOffsets: false,
            onTotalScrollOffset: 100
          }
        }
      }
    },

    /**
     * Configuration of the Group.
     *
     * @type {object}
     */
    Group: {
      options: {
        className: '',
        showFilter: false,
        showCommitButtons: false,
        showGroupSelection: false,
        showButtonOnlyThis: false,
        showSelectedItems: false,
        showButtonCollapse: false,
        showValue: false,
        showIcons: true,
        scrollThreshold: Infinity,
        isResizable: false
      },
      strings: {
        allItems: 'All',
        noItems: 'None',
        groupSelection: 'All',
        btnApply: 'Apply',
        btnCancel: 'Cancel',
        moreData: 'Get more data...'
      },
      view: {
        templates: templates.Group
      }
    },

    /**
     * Configuration of the Item.
     *
     * @type {object}
     */
    Item: {
      options: {
        className: '',
        showButtonOnlyThis: false,
        showValue: false,
        showIcons: true
      },
      strings: {
        btnOnlyThis: 'Only'
      },
      view: {
        templates: templates.Item
      }
    }
  });

});
