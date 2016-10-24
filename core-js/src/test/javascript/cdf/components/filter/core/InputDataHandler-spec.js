/*!
 * Copyright 2016 Pentaho Corporation. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
define([
  "cdf/components/filter/core/InputDataHandler",
  "cdf/components/filter/core/Model"
], function(InputDataHandler, Model) {
  "use strict";

  fdescribe("InputDataHandler", function() {
    var model;
    var inputDataHandler;
    var query;

    beforeEach(function() {
      model = new Model({
        id: "root"
      });
      query = jasmine.createSpyObj('query', ['getOption']);
      query.getOption.and.callFake(function(option) {
        switch (option) {
          case "pageSize":
            return 100;
          case "searchPattern":
            return "";
        }
      });

      inputDataHandler = new InputDataHandler({
        options: {
          query: query,
          indexes: {
            id: 0,
            label: 1,
            parentId: 2,
            parentLabel: 3
          }
        },
        model: model
      });
    });

    describe("#updateModel", function() {

      describe("should import data with two columns (id, label) to the model", function() {

        it("when data is an array", function() {
          var data = [
            ["one", "One"],
            ["two", "Two"]
          ];

          inputDataHandler.updateModel(data);

          expect(model.find('one').parent()).toBe(model);
          expect(model.find('two').parent()).toBe(model);
        });

        it("when data is a JSON-CDA", function() {
          var data = {
            metadata: [
              {
                colIndex: 0,
                colType: "string",
                colLabel: "id"
              }, {
                colIndex: 1,
                colType: "string",
                colLabel: "label"
              }
            ],
            resultset: [["one", "One"], ["two", "Two"]]
          };

          inputDataHandler.updateModel(data);

          expect(model.find('one').parent()).toBe(model);
          expect(model.find('two').parent()).toBe(model);
        });
      });

      describe("should import data with four columns (id, label, parentId, parentLabel) to the model", function() {

        it("when data is an array", function() {
          var data = [
            ["one", "One", "units", "Units"],
            ["two", "Two", "units", "Units"],
            ["ten", "Ten", "tens", "Tens"]
          ];

          inputDataHandler.updateModel(data);

          expect(model.find('units').parent()).toBe(model);
          expect(model.find('tens').parent()).toBe(model);
          expect(model.find('one').parent()).toBe(model.find('units'));
        });

        it("when data is a JSON-CDA", function() {
          var data = {
            metadata: [
              {
                colIndex: 0,
                colType: "string",
                colLabel: "id"
              }, {
                colIndex: 1,
                colType: "string",
                colLabel: "label"
              }, {
                colIndex: 2,
                colType: "string",
                colLabel: "parentId"
              }, {
                colIndex: 3,
                colType: "string",
                colLabel: "parentLabel"
              }
            ],
            resultset: [
              ["one", "One", "units", "Units"],
              ["two", "Two", "units", "Units"],
              ["ten", "Ten", "tens", "Tens"]
            ]
          };

          inputDataHandler.updateModel(data);

          expect(model.find('units').parent()).toBe(model);
          expect(model.find('tens').parent()).toBe(model);
          expect(model.find('one').parent()).toBe(model.find('units'));
        });

        it("when data represents a nested group", function() {
          var data = [
            ["item1", "item1", "second", "Second"],
            ["item2", "item2", "second", "Second"],
            ["second", "Second", "first", "First"],
            ["first", "first", "root", "Root"]
          ];

          inputDataHandler.updateModel(data);

          expect(model.find('first').parent()).toBe(model);
          expect(model.find('second').parent()).toBe(model.find('first'));
          expect(model.find('item1').parent()).toBe(model.find('second'));
        });

      });

      describe("should import data with a complex hierarchy to the model", function() {

        it("when data is an array", function() {
          var data = [
            ["2013-07-01", "July 1st, 2013", "2013-07", "July", "2013"],
            ["2013-07-02", "July 2nd, 2013", "2013-07", "July", "2013"],
            ["2014-10-21", "October 21st, 2014", "2014-10", "October", "2014"],
            ["2014-11-05", "November 5th, 2014", "2014-11", "November", "2014"]
          ];

          var inputDataHandler = new InputDataHandler({
            options: {
              query: query,
              indexes: [{
                id: 5,
                label: 5
              },{
                id: 4,
                label: 4
              },{
                id: 2,
                label: 3
              },{
                id: 0,
                label: 1
              }]
            },
            model: model
          });

          inputDataHandler.updateModel(data);

          expect(model.find('2013').parent()).toBe(model);
          expect(model.find('2013-07').parent()).toBe(model.find('2013'));
          expect(model.find('2013-07-01').parent()).toBe(model.find('2013-07'));
          expect(model.find('2013-07-02').parent()).toBe(model.find('2013-07'));
          expect(model.find('2014').parent()).toBe(model);
          expect(model.find('2014-10').parent()).toBe(model.find('2014'));
          expect(model.find('2014-10-21').parent()).toBe(model.find('2014-10'));
          expect(model.find('2014-11').parent()).toBe(model.find('2014'));
          expect(model.find('2014-11-05').parent()).toBe(model.find('2014-11'));
        });
      });

      it("uses the label as id when the option `valueAsId === true`", function() {
        it("when data is an array", function() {
          var data = [
            ["one", "One"],
            ["two", "Two"]
          ];

          inputDataHandler.updateModel(data);

          expect(model.find('one')).toBe(null);
          expect(model.find('One')).not.toBe(null);
          expect(model.find('One').get('label')).toBe('One');

        });
      });
    });
  });
});
