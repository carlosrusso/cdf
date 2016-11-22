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
  './Root',
  './Group',
  './Item',
  './templates',
  'css!./styles/filter',
  'css!./styles/filter-legacy',
  'css!./styles/filter-notifications'
], function($, _, Root, Group, Item, templates) {

  "use strict";

  /*
   * Default view settings
   */

  var RootConfig = {
    type: {
      constructor: Root,
      childConfig: {
        branch: 'Group',
        leaf: 'Item'
      }
    },
    view: {
      main: {
        template: templates.Root.container,
        render: [
          'header', 'controls', 'filter', 'footer', 'resizable',
          'collapse',
          'visibility', 'selection', 'value'
        ]
      },
      partials: {
        container: {
          selector: '.filter-root-container:eq(0)'
        },
        availability: {
          selector: '.filter-root-container:eq(0)',
          renderers: [updateAvailability],
          delays: {}
        },
        selection: {
          selector: '.filter-root-container:eq(0)',
          renderers: [updateGroupSelection],
          delays: {}
        },
        visibility: {
          selector: '.filter-root-container:eq(0)',
          renderers: [updateVisibility]
        },
        collapse: {
          selector: '.filter-root-container:eq(0)',
          renderers: [updateRootCollapse]
        },
        resizable: {
          selector: '.filter-root-items-container:eq(0)',
          renderers: [resizable]
        },
        controls: {
          selector: '.filter-root-control:eq(0) .filter-control-buttons',
          template: templates.Root.controls
        },
        filter: {
          selector: '.filter-filter:eq(0)',
          template: templates.Root.filter
        },
        header: {
          selector: '.filter-root-header:eq(0)',
          template: templates.Root.header
        },
        value: {
          selector: '.filter-root-selection-value:eq(0)',
          template: templates.Root.value
        },
        footer: {
          selector: '.filter-root-footer:eq(0)',
          template: templates.Root.footer
        },
        detach: {
          selector: '.filter-root-items-container:eq(0)'
        },
        children: {
          selector: '.filter-root-items:eq(0)'  //container where new children will be appended
        },
        child: {
          template: templates.Root.child
        }

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
        'click     .filter-overlay:eq(0)': 'click:outside',
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
        'click     .filter-overlay': onOverlayClick,
        'focusin   .filter-filter-input:eq(0)': function(){
          this.getSlot('container').toggleClass('filtering', true)
        },
        'focusout   .filter-filter-input:eq(0)': function(){
          if (this.model.get('searchPattern') === "")
            this.getSlot('container').toggleClass('filtering', false)
        }
      },
      patchViewModel: null,
      modelDebounceTimeMilliseconds: -1,
      throttleTimeMilliseconds: 1,
      delays: {
        "default": 1,
        filter: 100,
        renderOffline: {
          "default": 0,
          "change:isVisible": 100,
          "sort": -1
        }
      },
      overlaySimulateClick: true,
      scrollbar: {
        engine: 'native' || 'mCustomScrollbar',
        options: {
          theme: 'dark',
          alwaysTriggerOffsets: false,
          onTotalScrollOffset: 100
        }
      }
    }
  };

  var GroupConfig = {
    type: {
      constructor: Group,
      childConfig: {
        branch: 'Group',
        leaf: 'Item'
      }
    },
    view: {
      main: {
        render: [
          'resizable',
          'collapse', 'collapsible',
          'visibility', 'selection', 'value'
        ],
        template: templates.Group.container
      },
      partials: {
        selection: {
          selector: '.filter-group-container:eq(0)', // There can be nested groups
          renderers: [updateGroupSelection]
        },
        filter: {
          selector: '.filter-filter-input:eq(0)',
          template: templates.Group.filter
        },
        collapse: {
          selector: '.filter-group-container:eq(0)',
          renderers: [updateGroupCollapse]
        },
        collapsible: {
          selector: '.filter-group-body:eq(0), .filter-group-footer:eq(0)',
          renderers: [updateGroupCollapsible]
        },
        visibility: {
          selector: '.filter-group-container:eq(0)', // There can be nested groups
          renderers: [updateVisibility]
        },
        resizable: {
          selector: '.filter-group-container:eq(0)', // There can be nested groups
          renderers: [resizable]
        },
        value: {
          selector: '.filter-group-selection-value:eq(0)',
          template: templates.Group.value
        },
        children: {
          selector: '.filter-group-items:eq(0)'
        },
        child: {
          template: templates.Group.child
        },
        detach: {
          selector: '.filter-group-items-container:eq(0)'
        }
      },

      onModelChange: {
        'isVisible': ['visibility'],
        'value': ['value'],
        'isSelected': ['selection'],
        'isCollapsed': ['collapse', 'collapsible']
      },
      relayEvents: {
        'mouseover .filter-group-container:eq(0)': 'mouseover',
        'mouseout  .filter-group-container:eq(0)': 'mouseout',
        'click     .filter-group-selection:eq(0)': 'selected',
        'click     .filter-collapse-icon:eq(0)': 'toggleCollapse'
      },
      events: {},
      patchViewModel: null,
      modelDebounceTimeMilliseconds: 0,
      throttleTimeMilliseconds: 1,
      delays: {
        "default": 1,
        renderOffline: {
          "default": 0,
          "change:isVisible": 100,
          "sort": -1
        }
      }
    }
  };

  var ItemConfig = {
    type: {
      constructor: Item
    },
    view: {
      main: {
        render: ['visibility', 'selection', 'value'],
        template: templates.Item.container
      },
      partials: {
        selection: {
          selector: '.filter-item-container',
          renderers: [updateItemSelection]
        },
        visibility: {
          selector: '.filter-item-container',
          renderers: [updateVisibility]
        },
        value: {
          selector: '.filter-item-value',
          template: templates.Item.value
        }
      },

      onModelChange: {
        'isVisible': ['visibility'],
        'value': ['value'],
        'isSelected': ['selection']
      },
      relayEvents: {
        'click     .filter-item-collapse': 'toggleCollapse',
        'mouseover .filter-item-body': 'mouseover',
        'mouseout  .filter-item-body': 'mouseout',
        'click     .filter-item-body': 'selected',
        'click     .filter-item-only-this': 'control:only-this'
      },
      events: {},
      patchViewModel: null,
      modelDebounceTimeMilliseconds: 0,
      throttleTimeMilliseconds: 1,
      delays: {
        "default": 1
      }
    }
  };

  return {
    Root: RootConfig,
    Group: GroupConfig,
    Item: ItemConfig
  };

  /*
  return {
    Root: {
      type: {
        constructor: Root,
        childConfig: {
          branch: 'Group',
          leaf: 'Item'
        }
      },
      view: {
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
          detach: '.filter-root-items-container',
          children: '.filter-root-items'  //container where new children will be appended
        },
        render: [
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
          'click     .filter-overlay': onOverlayClick
        },
        patchViewModel: null,
        modelDebounceTimeMilliseconds: -1,
        throttleTimeMilliseconds: 1,
        delays: {
          "default": 1,
          filter: 100,
          renderOffline: {
            "default": 0,
            "change:isVisible": 100,
            "sort": -1
          }
        },
        overlaySimulateClick: true,
        scrollbar: {
          engine: 'native' || 'mCustomScrollbar',
          options: {
            theme: 'dark',
            alwaysTriggerOffsets: false,
            onTotalScrollOffset: 100
          }
        }
      }
    },

    Group: {
      type: {
        constructor: Group,
        childConfig: {
          branch: 'Group',
          leaf: 'Item'
        }
      },
      view: {
        templates: templates.Group,
        slots: {
          container: '.filter-group-container:eq(0)', // There can be nested groups
          selection: '.filter-group-header:eq(0)', // There can be nested groups
          filter: '.filter-filter-input:eq(0)',
          value: '.filter-group-selection-value',
          children: '.filter-group-items:eq(0)',
          detach: '.filter-group-items-container:eq(0)',
          collapsible: '.filter-group-body:eq(0), .filter-group-footer:eq(0)'
        },
        render: [
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
          'click     .filter-collapse-icon:eq(0)': 'toggleCollapse'
        },
        events: {
          'change    .filter-filter:eq(0)': 'onFilterChange',
          'keyup     .filter-filter:eq(0)': 'onFilterChange',
          'click     .filter-filter-clear:eq(0)': 'onFilterClear'
        },
        patchViewModel: null,
        modelDebounceTimeMilliseconds: 0,
        throttleTimeMilliseconds: 1,
        delays: {
          "default": 1,
          renderOffline: {
            "default": 0,
            "change:isVisible": 100,
            "sort": -1
          }
        }
      }
    },

    Item: {
      type: {
        constructor: Item
      },
      view: {
        templates: templates.Item,
        slots: {
          container: '.filter-item-container',
          value: '.filter-item-value'
        },
        render: ['visibility', 'selection', 'value'],
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
          'click     .filter-item-collapse': 'toggleCollapse',
          'mouseover .filter-item-body': 'mouseover',
          'mouseout  .filter-item-body': 'mouseout',
          'click     .filter-item-body': 'selected',
          'click     .filter-item-only-this': 'control:only-this'
        },
        events: {},
        patchViewModel: null,
        modelDebounceTimeMilliseconds: 0,
        throttleTimeMilliseconds: 1,
        delays: {
          "default": 1
        }
      }
    }
  };
  */

  function updateAvailability($tgt, viewModel, viewConfig, model, configuration) {
    $tgt.toggleClass('disabled', viewModel.isDisabled === true);
  }

  function resizable($tgt, viewModel, viewConfig, model, configuration) {
    if (viewConfig.options.isResizable && _.isFunction($tgt.resizable)) {
      $tgt.resizable({
        handles: 's'
      });
    }
  }

  function updateRootCollapse($tgt, viewModel, viewConfig, model, configuration) {

    var isAlwaysExpand = (viewModel.alwaysExpanded === true); // we might want to start off the component as always-expanded
    if (viewModel.isDisabled === true) {
      $tgt
        .toggleClass('expanded', false)
        .toggleClass('collapsed', !isAlwaysExpand)
        .toggleClass('always-expanded', isAlwaysExpand);
    } else if (isAlwaysExpand) {
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

  function filtering($tgt, viewModel, config, model, configuration){
    var isFiltering = model.get('searchPattern') !== "";

    $tgt.toggleClass('filtering', isFiltering);
  }

  function onOverlayClick(event) {
    //this.trigger("click:outside", this.model, event);

    if (this.config.view.overlaySimulateClick === true) {

      // this.$slots.container
      //   .toggleClass('expanded', false)
      //   .toggleClass('collapsed', true);

      var $overlay = this.$('.filter-overlay:eq(0)');

      $overlay.hide();
      _.delay(function() {
        var $element = $(document.elementFromPoint(event.clientX, event.clientY));

        $element.closest('.filter-root-header').click();
        $overlay.show();
      }, 0);
    }
  }

  function updateGroupCollapse($tgt, viewModel, viewConfig, model, configuration) {
    var isCollapsed = viewModel.isCollapsed;

    $tgt // change to container
      .toggleClass('collapsed', isCollapsed)
      .toggleClass('expanded', !isCollapsed);
  }

  function updateGroupCollapsible($tgt, viewModel, viewConfig, model, configuration) {
    $tgt.toggleClass('filter-hidden', viewModel.isCollapsed);
  }

  function updateGroupSelection($tgt, viewModel, viewConfig, model, configuration) {
    $tgt
      .toggleClass('none-selected', viewModel.noItemsSelected)
      .toggleClass('all-selected', viewModel.allItemsSelected)
      .toggleClass('some-selected', viewModel.isPartiallySelected);
  }

  function updateItemSelection($tgt, viewModel, viewConfig, model, configuration) {
    var isSelected = model.get('isSelected');
    $tgt
      .toggleClass('none-selected', !isSelected)
      .toggleClass('all-selected', isSelected);
  }

  function updateVisibility($tgt, viewModel, viewConfig, model, configuration) {
    $tgt.toggleClass('filter-hidden', !model.get('isVisible'));
  }


});
