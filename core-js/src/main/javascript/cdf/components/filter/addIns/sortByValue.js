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
  '../../../Dashboard.Clean',
  '../../../AddIn',
  './sortByProperty'
], function($, _, Dashboard, AddIn, sortByProperty) {

  'use strict';

  /*
   * Sorts items/groups by value
   */
  var sortByValue = $.extend(true, {}, sortByProperty, {
    name: 'sortByValue',
    label: 'Sort items by value',
    defaults: {
      ascending: false,
      property: 'value',
      comparer: function(left, right){
        var l = Number(left);
        var r = Number(right);
        if (l === r) {
          return 0;
        }
        return l < r ? -1 : 1;
      }
    }
  });

  Dashboard.registerGlobalAddIn('FilterComponent', 'sortItem', new AddIn(sortByValue));
  Dashboard.registerGlobalAddIn('FilterComponent', 'sortGroup', new AddIn(sortByValue));

  return sortByValue;
});
