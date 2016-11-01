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
  'text!./templates/Root-skeleton.html',
  'text!./templates/Root-overlay.html',
  'text!./templates/Root-header.html',
  'text!./templates/Root-controls.html',
  'text!./templates/Root-selection.html',
  'text!./templates/Root-footer.html',
  'text!./templates/Group-skeleton.html',
  'text!./templates/Group-selection.html',
  'text!./templates/Item-template.html',
  'text!./templates/partial-filter.html'
], function(
  RootSkeleton,
  RootOverlay,
  RootHeader,
  RootControls,
  RootSelection,
  RootFooter,
  GroupSkeleton,
  GroupSelection,
  ItemTemplate,
  filter
) {

  "use strict";

  var item = f(ItemTemplate);
  var partials = {
    filter: f(filter)
  };

  return {
    Root: {
      skeleton: f(RootSkeleton),
      overlay: f(RootOverlay),
      header: f(RootHeader),
      controls: f(RootControls),
      selection: f(RootSelection),
      footer: f(RootFooter),
      child: '<div class="filter-root-child"/>',
      partials: partials
    },

    Group: {
      skeleton: f(GroupSkeleton),
      selection: f(GroupSelection),
      child: '<div class="filter-group-child"/>',
      partials: partials
    },

    Item: {
      skeleton: item,
      selection: item,
      partials: partials
    }
  };

  function f(template){
    return template.replace(/\s+/g, ' ');
  }

});
