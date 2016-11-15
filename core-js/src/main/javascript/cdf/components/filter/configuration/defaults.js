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
  'amd!../../../lib/underscore',
  '../views',
  './templates'
], function( $, _, views, templates ) {

  "use strict";

  /*
   * Default settings
   */
  var privateDefaults = /** @lends cdf.components.filter.configuration.defaults */ {
    Root: {
      sorters: [],
      view: {
        renderers: {},
        patchViewModel: null,
        modelDebounceTimeMilliseconds: 1,
        throttleTimeMilliseconds: 3,
        overlaySimulateClick: true
      }
    },
    Group: {
      sorters: [],
      view: {
        renderers: {},
        patchViewModel: null,
        modelDebounceTimeMilliseconds: 1,
        throttleTimeMilliseconds: 3
      }
    },
    Item: {
      sorters: [],
      view: {
        renderers: {},
        patchViewModel: null,
        modelDebounceTimeMilliseconds: -1,
        throttleTimeMilliseconds: 1
      }
    }
  };

  var viewDefaults = {
    Root: {
      view: {
        constructor: views.Root,
        childConfig: {
          withChildrenPrototype: 'Group',
          withoutChildrenPrototype: 'Item'
        },

        templates: templates.Root,
        slots: {
          container: '.filter-root-container:eq(0)',
          availability: '.filter-root-container:eq(0)',
          selection: '.filter-root-selection',
          controls: '.filter-root-control:eq(0) .filter-control-buttons',
          filter: '.filter-filter-input:eq(0)',
          header: '.filter-root-header',
          value: '.filter-root-selection-value',
          footer: '.filter-root-footer',
          children: '.filter-root-items'  //container where new children will be appended
        },
        fullRender: [
          'header', 'controls', 'footer', 'resizable',
          'collapse',
          'visibility', 'selection', 'value'
        ],
        renderers: {
          selection: [updateGroupSelection],
          visibility: [updateVisibility],
          collapse: [updateRootCollapse],
          resizable: [resizable],
          availability: [updateAvailability]
        },
        onModelChange: {
          'isDisabled': ['availability'],
          'isVisible': ['visibility'],
          'isCollapsed': ['collapse'],
          'isSelected': ['selection', 'controls', 'header'],
          'selectedItems': ['controls'],
          'value': ['value'],
          'isBusy': ['footer'],
          'numberOfSelectedItems': ['header', 'footer'],
          'numberOfItems': ['header']
        },
        relayEvents: {
          'mouseover .filter-root-header': 'mouseover',
          'mouseout  .filter-root-header': 'mouseout',
          'click     .filter-root-header:eq(0)': 'toggleCollapse',
          'click     .filter-root-selection:eq(0)': 'selected',
          'click     .filter-btn-apply:eq(0)': 'control:apply',
          'click     .filter-btn-cancel:eq(0)': 'control:cancel'
        },
        events: {
          'keyup     .filter-filter:eq(0)': 'onFilterChange',
          'change    .filter-filter:eq(0)': 'onFilterChange',
          'click     .filter-filter-clear:eq(0)': 'onFilterClear',
          'click     .filter-overlay': 'onOverlayClick'
        }
      }
    },

    Group: {
      view: {
        constructor: views.Group,
        childConfig: {
          withChildrenPrototype: 'Group',
          withoutChildrenPrototype: 'Item'
        },

        templates: templates.Group,
        slots: {
          container: '.filter-group-container:eq(0)', // There can be nested groups
          selection: '.filter-group-header:eq(0)', // There can be nested groups
          filter: '.filter-filter-input:eq(0)',
          value: '.filter-group-selection-value',
          children: '.filter-group-items:eq(0)',
          collapsible: '.filter-group-body:eq(0), .filter-group-footer:eq(0)'
        },
        fullRender: [
          'resizable',
          'collapse',
          'visibility', 'selection', 'value'
        ],
        renderers: {
          selection: [updateGroupSelection],
          visibility: [updateVisibility],
          resizable: [resizable],
          collapse: [updateGroupCollapse]
        },
        onModelChange: {
          'isVisible': ['visibility'],
          'value': ['value'],
          'isSelected': ['selection'],
          'isCollapsed': ['collapse']
        },
        relayEvents: {
          'mouseover .filter-group-container:eq(0)': 'mouseover',
          'mouseout  .filter-group-container:eq(0)': 'mouseout',
          'click     .filter-group-selection:eq(0)': 'selected',
          'click     .filter-collapse-icon:eq(0)' : 'toggleCollapse'
        },
        events: {
          'change    .filter-filter:eq(0)': 'onFilterChange',
          'keyup     .filter-filter:eq(0)': 'onFilterChange',
          'click     .filter-filter-clear:eq(0)': 'onFilterClear'
        }
      }
    },

    Item: {
      view: {
        constructor: views.Item,
        templates: templates.Item,
        slots: {
          container: '.filter-item-container',
          selection: '.filter-item-container',
          value: '.filter-item-value'
        },
        fullRender: ['visibility', 'selection', 'value'],
        renderers: {
          selection: [updateItemSelection],
          visibility: [updateVisibility]
        },
        onModelChange: {
          'isVisible': ['visibility'],
          'value': ['value'],
          'isSelected': ['selection']
        },
        relayEvents: {
          'click     .filter-item-collapse' : 'toggleCollapse',
          'mouseover .filter-item-body': 'mouseover',
          'mouseout  .filter-item-body': 'mouseout',
          'click     .filter-item-body': 'selected',
          'click     .filter-item-only-this': 'control:only-this'
        },
        events: {}
      }
    }
  };

  function updateAvailability($el, model, viewModel, configuration) {
    this.$slots.availability.toggleClass('disabled', viewModel.isDisabled === true);
  }

  function resizable($el, model, viewModel, configuration) {
    if (this.config.options.isResizable) {
      var $container = this.$slots.children.parent();
      if (_.isFunction($container.resizable)) {
        $container.resizable({
          handles: 's'
        });
      }
    }
  }

  function updateRootCollapse($el, model, viewModel, configuration) {
    var $tgt = this.$slots.container;

    if (viewModel.isDisabled === true) {
      var isAlwaysExpand = (viewModel.alwaysExpanded === true); // we might want to start off the component as always-expanded
      $tgt
        .toggleClass('expanded', false)
        .toggleClass('collapsed', !isAlwaysExpand)
        .toggleClass('always-expanded', isAlwaysExpand);
    } else if (viewModel.alwaysExpanded === true) {
      $tgt
        .toggleClass('expanded', false)
        .toggleClass('collapsed', false)
        .toggleClass('always-expanded', true);
    } else {
      var isCollapsed = viewModel.isCollapsed;
      $tgt
        .toggleClass('expanded', !isCollapsed)
        .toggleClass('collapsed', isCollapsed)
        .toggleClass('always-expanded', false);
    }
  }

  function updateGroupCollapse($el, model, viewModel, configuration) {
    var isCollapsed = viewModel.isCollapsed;

    this.$('.filter-collapse-icon')
      .toggleClass('collapsed', isCollapsed)
      .toggleClass('expanded', !isCollapsed);

    var $collapsible = this.$slots.collapsible;
    $collapsible.toggleClass('hidden', isCollapsed);
  }

  function updateGroupSelection($el, model, viewModel, configuration) {
    this.$slots.container
      .toggleClass('none-selected', viewModel.noItemsSelected)
      .toggleClass('all-selected', viewModel.allItemsSelected)
      .toggleClass('some-selected', viewModel.isPartiallySelected);
  }

  function updateItemSelection($el, model, viewModel, configuration) {
    this.$slots.container
      .toggleClass('none-selected', !model.get('isSelected'))
      .toggleClass('all-selected', model.get('isSelected'));
  }

  function updateVisibility($tgt, model, viewModel, configuration) {
    this.$slots.container.toggleClass('filter-hidden', !model.get('isVisible'));
  }


  /**
   * @class cdf.components.filter.configuration.defaults
   * @amd cdf/components/filter/configuration/defaults
   * @classdesc Filter component default values.
   * @ignore
   */
  return $.extend(true, {}, privateDefaults, viewDefaults,  /** @lends cdf.components.filter.configuration.defaults */ {

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
        styles: [],
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
        styles: [],
        showButtonOnlyThis: false,
        showValue: false,
        showIcons: true
      },
      strings: {
        btnOnlyThis: 'Only'
      }
    }
  });


});
