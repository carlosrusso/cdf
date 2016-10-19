/*!
 * Copyright 2002 - 2015 Webdetails, a Pentaho company. All rights reserved.
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
  '../../../lib/mustache',
  'text!./templates/Group-skeleton.html',
  'text!./templates/Group-selection.html',
  'text!./templates/Item-template.html',
  'text!./templates/Root-skeleton.html',
  'text!./templates/Root-overlay.html',
  'text!./templates/Root-header.html',
  'text!./templates/Root-controls.html',
  'text!./templates/Root-selection.html',
  'text!./templates/Root-footer.html',
], function(
  Mustache,
  GroupSkeleton,
  GroupSelection,
  ItemTemplate,
  RootSkeleton,
  RootOverlay,
  RootHeader,
  RootControls,
  RootSelection,
  RootFooter
) {

  "use strict";

  var templates = {};
  function _loadTemplate(name, source) {
    templates[name] = source.replace(/\s+/g, ' ');
    Mustache.parse(templates[name]);
  }

  _loadTemplate("Root-skeleton", RootSkeleton);
  _loadTemplate("Root-overlay", RootOverlay);
  _loadTemplate("Root-header", RootHeader);
  _loadTemplate("Root-controls", RootControls);
  _loadTemplate("Root-selection", RootSelection);
  _loadTemplate("Root-footer", RootFooter);

  _loadTemplate("Group-skeleton", GroupSkeleton);
  _loadTemplate("Group-selection", GroupSelection);

  _loadTemplate("Item-template", ItemTemplate);

  _loadTemplate(undefined, "No template");

  return templates;
});
