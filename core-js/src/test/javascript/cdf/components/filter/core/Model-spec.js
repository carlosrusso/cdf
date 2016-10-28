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
  "cdf/components/filter/core/Model"
], function(Model) {
  "use strict";

  describe("cdf/components/filter/core/Model", function() {

    var model;

    beforeEach(function() {
      model = new Model({
        id: "root",
        nodes: [{
          id: "child1"
        },{
          id: "child2"
        },{
          id: "child3"
        }]
      });
    });

    describe("#isBusy, #setBusy", function(){
      it("should be `false` by default", function() {
        expect(model.isBusy()).toBe(false);
      });

      it("should act globally", function() {
        model.find("child1").setBusy(true);
        expect(model.find("child3").isBusy()).toBe(true);

        model.find("child2").setBusy(false);
        expect(model.find("child3").isBusy()).toBe(false);
      });

    });
  });
});
