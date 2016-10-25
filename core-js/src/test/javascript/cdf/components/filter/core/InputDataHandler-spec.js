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

          expectChildOf('one', 'root');
          expectChildOf('two', 'root');
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

          expectChildOf('one', 'root');
          expectChildOf('two', 'root');
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

          expectChildOf('units', 'root');
          expectChildOf('tens', 'root');
          expectChildOf('one', 'units');
        });

        it("when data represents an ordered nested group", function() {
          var data = [
            ["first", "First", "root", "Root"],
            ["second", "Second", "first", "First"],
            ["item1", "item1", "second", "Second"],
            ["item2", "item2", "second", "Second"]
          ];

          inputDataHandler.updateModel(data);

          expectChildOf('item1', 'second');
          expectChildOf('second', 'first');
          expectChildOf('first', 'root');
        });

        it("when data represents an unordered nested group", function() {
          var data = [
            ["item1", "item1", "second", "Second"],
            ["item2", "item2", "second", "Second"],
            ["first", "First", "root", "Root"],
            ["second", "Second", "first", "First"]
          ];

          inputDataHandler.updateModel(data);

          //expect(JSON.stringify(model.toJSON(), true, " ")).toBe("");

          expectChildOf('item1', 'second');
          expectChildOf('second', 'first');
          expectChildOf('first', 'root');
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

          expectChildOf('2013', 'root');
          expectChildOf('2013-07', '2013');
          expectChildOf('2013-07-01', '2013-07');
          expectChildOf('2013-07-02', '2013-07');

          expectChildOf('2014', 'root');
          expectChildOf('2014-10', '2014');
          expectChildOf('2014-10-21', '2014-10');
          expectChildOf('2014-11', '2014');
          expectChildOf('2014-11-05', '2014-11');

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

    function expectChildOf(idChild, idParent){
      expect(model.find(idChild).parent().get('id')).toBe(idParent);
    }

  });
});
