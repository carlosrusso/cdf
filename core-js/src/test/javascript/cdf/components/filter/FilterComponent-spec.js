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
  "cdf/Dashboard.Clean",
  "cdf/components/FilterComponent",
  "cdf/lib/jquery",
  "amd!cdf/lib/underscore"
], function(Dashboard, FilterComponent, $, _) {

  /**
   * ## The Filter Component
   *
   * Although the major parts of the component have its unit tests,
   * the following tests focus on their integration as a whole.
   */
  describe("FilterComponent", function() {

    var dashboard, filterComponent, $htmlObject, testFilterDefaults;
    var testData ;

    function getNewFilterComponent(options) {
      return new FilterComponent($.extend(true, testFilterDefaults, options));
    }

    function getNewDashboard() {
      var dashboard = new Dashboard();
      dashboard.init();
      dashboard.addParameter("selectionParam", []);
      return dashboard;
    }


    function getCdaJson(resultset, metadata) {
      return {
        resultset: resultset,
        metadata: metadata,
        status: "success"
      };
    }

    function uponInit(component, dashboard, callback, done) {
      dashboard.addComponent(component);

      component.once('cdf:postExecution', function(){
        callback(component);
      });
      component.once('getData:failed', function(){
        done && done.fail(); // ensure test fails before jasmine's timeout
      });

      dashboard.update(component);
    }

    beforeEach(function() {

      testData = {
        resultset: [
          [1.1, "One", "Ones"],
          [1.2, "Two", "Ones"],
          [1.3, "Three", "Ones"],
          [1.4, "Four", "Ones"],
          //
          [2.1, "One", "Twos"],
          [2.2, "Two", "Twos"],
          [2.3, "Three", "Twos"],
          [2.4, "Four", "Twos"]
        ],
        metadata: [
          {
            colIndex: 0,
            colType: "Numeric",
            colName: "group"
          },
          {
            colIndex: 1,
            colType: "String",
            colName: "type"
          },
          {
            colIndex: 2,
            colType: "String",
            colName: "empty"
          }
        ]
      };

      testFilterDefaults = {
        type: "FilterComponent",
        name: "render_filter",
        priority: 5,
        executeAtStart: true,
        htmlObject: "sampleObjectFilter",
        listeners: [],
        parameter: "selectionParam",
        parameters: [],
        options: function() {
          return {};
        },
        queryDefinition: {},
        componentInput: {
          valueAsId: false,
          valuesArray: testData.resultset
        },
        componentOutput: {
          outputFormat: "lowestID"
        },
        componentDefinition: {
          title: "FilterComponent-spec",
          alwaysExpanded: false,
          multiselect: false,
          showIcons: true,
          showButtonOnlyThis: true,
          useOverlay: false,
          showFilter: true
        },
        addIns: {
          postUpdate: [],
          renderRootHeader: [],
          renderRootSelection: [],
          renderRootFooter: [],
          renderGroupSelection: [],
          renderItemSelection: [],
          sortGroup: [],
          sortItem: []
        }
      };

      filterComponent = getNewFilterComponent();

      $htmlObject = $('<div />').attr('id', filterComponent.htmlObject);
      dashboard = getNewDashboard();
      $('body').empty().append($htmlObject);

    });

    describe("obeys the CDF lifecycle", function() {

      it("allows a dashboard to execute update", function(done) {

        spyOn(filterComponent, 'update').and.callThrough();

        uponInit(filterComponent, dashboard, function() {
          expect(filterComponent.update).toHaveBeenCalled();
          done();
        });

      });

      it('follows the lifecycle preExecution ->  "getData:success" -> postExecution ' +
        'when the component is fed via valuesArray', function(done) {

        var sequence = [];

        filterComponent.preExecution = function() {
          sequence.push('preExecution');
        };

        filterComponent.postFetch = function() {
          sequence.push('postFetch');
        };

        filterComponent.on('getData:success', function() {
          sequence.push('getData:success')
        });

        filterComponent.postExecution = function() {
          expect(sequence).toEqual(['preExecution', 'getData:success']);
          done();
        };

        uponInit(filterComponent, dashboard, function() {});

      });

      it('follows the lifecycle preExecution ->  postFetch -> "getData:success" -> postExecution ' +
        'when the component is fed via a datasource', function(done) {

        spyOn($, 'ajax').and.callFake(function(params) {
          params.success(testData);
        });

        dashboard.addDataSource("someDatasource", {
          dataAccessId: "testId",
          path: "/test.cda"
        });

        filterComponent.queryDefinition = {
          dataSource: "someDatasource"
        };

        var sequence = [];

        filterComponent.preExecution = function() {
          sequence.push('preExecution');
        };

        filterComponent.postFetch = function() {
          sequence.push('postFetch');
        };

        filterComponent.on('getData:success', function() {
          sequence.push('getData:success')
        });

        filterComponent.postExecution = function() {
          expect(sequence).toEqual(['preExecution', 'postFetch', 'getData:success']);
          done();
        };

        uponInit(filterComponent, dashboard, function() {});

      });
    });

    describe("generates the correct configuration based on high-level options", function() {

      describe('when "multiselect" is true', function() {
        var configuration;

        beforeEach(function() {
          filterComponent.dashboard = dashboard;
          filterComponent.componentDefinition.multiselect = true;
          configuration = filterComponent.getConfiguration();
        });

        it('the default strategy is "LimitedSelect"', function() {
          expect(configuration.component.selectionStrategy.type).toBe("LimitedSelect");
        });

        it('the "only" button should honor the option showButtonOnlyThis', function() {
          _.each([true, false], function(v) {
            filterComponent.componentDefinition.showButtonOnlyThis = v;

            configuration = filterComponent.getConfiguration();

            _.each(["Root", "Group", "Item"], function(viewType) {
              expect(configuration.component[viewType].options.showButtonOnlyThis).toBe(v);
            });
          });
        });

        it("the apply/cancel buttons should be enabled ", function() {
          expect(configuration.component.Root.options.showCommitButtons).toBe(true);
        });

      });

      describe('when "multiselect" is false', function() {
        var configuration;

        beforeEach(function() {
          filterComponent.dashboard = dashboard;
          filterComponent.componentDefinition.multiselect = false;
          configuration = filterComponent.getConfiguration();
        });

        it('the default strategy is "SingleSelect"', function() {
          expect(configuration.component.selectionStrategy.type).toBe("SingleSelect");
        });

        it('the "only" button should be disabled', function() {
          _.each([true, false], function(v) {
            filterComponent.componentDefinition.showButtonOnlyThis = v;

            configuration = filterComponent.getConfiguration();

            _.each(["Root", "Group", "Item"], function(viewType) {
              expect(configuration.component[viewType].options.showButtonOnlyThis).toBe(false);
            });
          });
        });

        it("the apply/cancel buttons should be disabled", function() {
          expect(configuration.component.Root.options.showCommitButtons).toBe(false);
        });

      })

    });

    describe("user interaction", function() {
      it("sorts children according to an array of custom sorting functions", function(done) {
        dashboard.addDataSource("selectionDataSource", {
          dataAccessId: "testId",
          path: "/test.cda"
        });

        var filterComponent = getNewFilterComponent({
          queryDefinition: {dataSource: "selectionDataSource"},
          componentInput: {valuesArray: []},
          options: function() {
            return {
              input: {
                indexes: {
                  id: 0,
                  label: 1,
                  parentId: null,
                  parentLabel: null,
                  value: 4
                }
              },
              component: {
                Item: {
                  options: {
                    showValue: true
                  }
                },
                search: {serverSide: true}
              }
            };
          },
          addIns: {sortItem: ["sortByValue", "sortByLabel"]}
        });


        filterComponent.setAddInOptions('sortItem', 'sortByValue', {ascending: true});
        filterComponent.setAddInOptions('sortItem', 'sortByLabel', {ascending: true});

        spyOn($, 'ajax').and.callFake(function(params) {
          params.success(getCdaJson(
            [
              ["One", "label1", null, null, 60],
              ["Two", "label2", null, null, 7],
              ["Three", "label1", null, null, 7]
            ],
            [{colIndex: 0, colType: "String", colName: "id"},
              {colIndex: 1, colType: "String", colName: "name"},
              {colIndex: 4, colType: "Numeric", colName: "value"}]));
        });

        uponInit(filterComponent, dashboard, function(filterComponent) {

          var labels = [];
          filterComponent.placeholder('.filter-item-label').each(function(idx, el){
            labels.push($(el).html());
          });

          var values = [];
          filterComponent.placeholder('.filter-item-value').each(function(idx, el){
            values.push($(el).html());
          });

          expect(labels).toEqual(["label1", "label2", "label1"]);
          expect(values).toEqual(["7", "7", "60"]);

          done();
        });

      });

      xit("clears search input if no match is found and component is being expanded", function(done) {
        uponInit(filterComponent, dashboard,  function() {

          // simulate a search term that doesn't have any matches
          filterComponent.placeholder('.filter-filter-input:eq(0)')
            .val("fake_search_text")
            .trigger("change");

          expect(filterComponent.model.get('isCollapsed')).toBe(true);

          // filterComponent.model.on('change:isCollapsed', function(){
          //   // We are relying on the fact that this listener is handled last
          //   setTimeout(function() {
          //   var text = filterComponent.placeholder('.filter-filter-input:eq(0)').val();
          //   expect(text).toBe("");
          //   done();
          //   }, 0);
          // });

          var view = filterComponent.manager.get("view");
          spyOn(view, 'updateFilter').and.callFake(function(){
            var text = this.model.root().get('searchPattern');
            expect(text).toBe("");
            done();
          });

          var strategy = filterComponent.manager.get("configuration").selectionStrategy.strategy;
          strategy.toggleCollapse(filterComponent.model);
          //expect(filterComponent.model.get('searchPattern')).toBe("");

          expect(view.updateFilter).toHaveBeenCalled();
        });

      });

      it("updates the count of selected items when triggering onOnlyThis", function(done) {
        var selectionLimit = 5;
        filterComponent = getNewFilterComponent({
          componentDefinition: {
            multiselect: true,
            selectionLimit: selectionLimit
          }
        });

        uponInit(filterComponent, dashboard, function() {
          var rootModel = filterComponent.model;
          expect(rootModel.get('numberOfSelectedItems')).toBe(0);

          var items = filterComponent.placeholder('.filter-item-body');
          for (var i = 0; i < selectionLimit; i++) {
            items[i].click();
          }
          expect(rootModel.get('numberOfSelectedItems')).toBe(selectionLimit);

          filterComponent.placeholder('.filter-item-only-this:eq(0)').click();
          expect(rootModel.get('numberOfSelectedItems')).toBe(1);

          done();
        }, done);

      });
    });

    describe("server interaction", function() {
      itSearches("search works with searchServerSide = true and pageSize > 0", true, 10);
      itSearches("search works with searchServerSide = false and pageSize > 0", false, 10);
      itSearches("search works with searchServerSide = true and pageSize = 0", true, 0);
      itSearches("search works with searchServerSide = false and pageSize = 0", false, 0);

      it("pagination: infinite scrolling", function(done) {
        var dashboard = getNewDashboard();
        dashboard.addDataSource("mockDataSource", {
          dataAccessId: "testId",
          path: "/test.cda"
        });

        var filterComponent = getNewFilterComponent({
          queryDefinition: {
            dataSource: "mockDataSource",
            pageSize: 10
          },
          componentInput: {
            valuesArray: []
          },
          options: function() {
            return {
              component: {
                Root: {
                  view: {
                    scrollbar: {
                      engine: 'fake' //disable scrollbar
                    }
                  }
                }
              }
            };
          }
        });

        mockServerData();

        uponInit(filterComponent, dashboard, function() {
          // confirm that the first page was loaded correctly
          var rootModel = filterComponent.model;
          expect(getLabels(rootModel)).toEqual(["Default1", "Default2"]);

          filterComponent.inputDataHandler.on('postUpdate', function(model) {
            // confirm new data was added
            expect(getLabels(rootModel)).toEqual([
              "Default1",
              "Default2",
              "Default3",
              "Default4"
            ]);

            done();
          });

          // force loading the next page
          var view = filterComponent.manager.get('view');
          view.trigger('scroll:reached:bottom', rootModel);
        });
      });

      function itSearches(caption, serverSide, pageSize) {
        it(caption, function(done) {
          var dashboard = getNewDashboard();
          dashboard.addDataSource("mockDataSource", {
            dataAccessId: "testId",
            path: "/test.cda"
          });

          var filterComponent = getNewFilterComponent({
            queryDefinition: {
              dataSource: "mockDataSource",
              // BaseQuery will not accept pageSize <= 0, it will default to it though
              pageSize: ((pageSize > 0) ? pageSize : null)
            },
            componentInput: {
              valuesArray: []
            },
            options: function() {
              return {
                component: {
                  Root:{
                    view: {
                      scrollbar: {
                        engine: 'fake' //disable scrollbar
                      }
                    }
                  },
                  search: {
                    serverSide: serverSide
                  }
                }
              };
            }
          });

          mockServerData();

          uponInit(filterComponent, dashboard, function() {

            // confirm that the advanced options were generated correctly
            var configuration = filterComponent.manager.get('configuration');
            expect(configuration.search.serverSide).toBe(serverSide);
            expect(configuration.pagination.pageSize).toBe((pageSize > 0) ? pageSize : Infinity);

            // confirm that the first page was loaded correctly
            var rootModel = filterComponent.model;
            expect(getLabels(rootModel)).toEqual(["Default1", "Default2"]);

            if (serverSide) {
              filterComponent.inputDataHandler.on('postUpdate', function(model) {
                // new data was added
                expect(getLabels(rootModel)).toEqual(["Default1", "Default2", "Default3", "Default4"]);

                var visibility = rootModel.leafs()
                  .map(function(m){
                    return m.getVisibility();
                  })
                  .value();
                expect(visibility).toEqual([false, false, false, false]);
                done();
              });

            } else {
              // there should be no second ajax request
              filterComponent.inputDataHandler.on('postUpdate', function(model) {
                done.fail();
              });

              rootModel._filter = function(){
                expect(getLabels(rootModel)).toEqual(["Default1", "Default2"]);
                done(); //
              };
            }

            // populate the search box
            filterComponent.placeholder('.filter-filter-input')
              .val(_.uniqueId('unique_search_pattern_'))
              .trigger("change");
          });

        });
      }

      function getLabels(model) {
        return model.children().map(function(m) {
          return m.get('label');
        });
      }

      function mockServerData() {
        var firstCallToServer = true;
        spyOn($, 'ajax').and.callFake(function(params) {
          if (firstCallToServer) {

            firstCallToServer = false;

            params.success(getCdaJson([
              [1.1, "Default1"],
              [1.2, "Default2"]
            ], testData.metadata));


          } else {

            params.success(getCdaJson([
              [1.3, "Default3"],
              [1.4, "Default4"]
            ], testData.metadata));

          }
        });
      }

    });

    describe("Search Mechanism #", function() {

      function getFilterWithMatcher(matcher) {
        return getNewFilterComponent({
          componentInput: {
            valuesArray: [
              [0, "Twenty-One", "Twenties"],
              [1, "Twenty-Two", "Twenties"],
              [2, "Twenty-Three", "Twenties"],
              [3, "Twenty-Four", "Twenties"],
              [4, "Fourty-Seven", "Fourties"],
              [5, "Fourty-Nine", "Fourties"],
              [6, "Fourty-Five", "Fourties"],
              [7, "Fourty-One", "Fourties"]
            ]
          },
          options: function() {
            return {
              component: {
                input: {
                  indexes: {
                    id: 0,
                    label: 1,
                    parentId: 2
                  }
                },
                search: {
                  matcher: matcher
                }
              }
            };
          }
        });
      };

      describe("sets the visibility based on matches", function() {
        var searchTerms;

        beforeEach(function() {
          searchTerms = ["ve", "went", "our", "twenty-one"];
        });

        it("hides the items that don't match", function(done) {
          var filterComponent = getFilterWithMatcher();
          uponInit(filterComponent, dashboard, function() {
            var searchCount = [2, 4, 5, 1];
            // need to make sure the component is already fully initialized
            for (var i = 0; i < searchTerms.length; i++) {
              expectMatchCount(filterComponent, searchTerms[i], searchCount[i]);
            }
            done();
          });

        });

        it("allows defining a specific matcher", function(done) {
          // overriding the matcher, will filter the opposite of what is typed:
          // ex. "a"  yields ["b", "c"] in ["a", "b", "c"]
          var filterComponent = getFilterWithMatcher(function(m, fragment) {
            return m.get('label').toLowerCase().indexOf(fragment.toLowerCase()) == -1;
          });
          uponInit(filterComponent, dashboard, function() {
            var searchCount = [6, 4, 3, 7];
            for (var i = 0; i < searchTerms.length; i++) {
              expectMatchCount(filterComponent, searchTerms[i], searchCount[i]);
            }
            done();
          });

        });

        function expectMatchCount(filterComponent, searchTerm, expectedMatchCount) {
          filterComponent.model.filterBy(searchTerm);

          var n = filterComponent.model.leafs()
            .filter(function(model) {
              return model.getVisibility();
            })
            .size()
            .value();

          expect(n).toBe(expectedMatchCount);
        }
      });

      describe("respects user input", function() {

        var expectSearchFor = function(searchText) {
          return function(done) {
            var filterComponent = getFilterWithMatcher();

            uponInit(filterComponent, dashboard, function() {
              var rootModel = filterComponent.model;

              spyOn(rootModel, 'filterBy').and.callThrough();
              rootModel.on('change:searchPattern', function() {
                expect(rootModel.filterBy).toHaveBeenCalledWith(searchText);
                done();
              });

              filterComponent.placeholder('.filter-filter-input')
                .val(searchText)
                .trigger("change");
            });
          };
        };

        it("in lowercase", expectSearchFor("lowercase"));
        it("in uppercase", expectSearchFor("UPPERCASE"));
        it("in mixed case", expectSearchFor("mixedCase"));
        it("numeric", expectSearchFor("12345"));
        it("with non-alphanumeric characters", expectSearchFor("special \"#$%& Characters"));
      });

    });

    describe("Selection Mechanism #", function() {

      var rootId = "TestRoot";

      var expectSelection = function(filterComponent, dashboard, options, done) {
        options = options || {};


        var witness = {};
        dashboard.on('selectionParam:fireChange', function(obj) {
          var selection = obj.value;
          expect(selection.length).toBe(
            (options.root || options.single) ? 1 : witness._items.length
          );

          if (options.root) {
            expect(selection).toEqual([rootId]);
          }
          done();
        });

        uponInit(filterComponent, dashboard, function(filterComponent) {

          var items = filterComponent.placeholder('.filter-item-body');
          witness._items = items;
          items.click(); //click all items (leafs)

          if (options.single !== true) {
            filterComponent.placeholder('.filter-btn-apply')
              .removeAttr('disabled') // force the click event to be triggered
              .click();
          }
        });

      };

      it("works as intended in single select mode", function(done) {
        var filterComponent = getNewFilterComponent({
          componentDefinition: {
            multiselect: false
          }
        });
        expectSelection(filterComponent, dashboard, {single: true}, done);
      });

      it("works as intended in multi select mode", function(done) {
        var filterComponent = getNewFilterComponent({
          componentDefinition: {
            multiselect: true
          }
        });
        expectSelection(filterComponent, dashboard, {}, done);
      });

      it("works with valuesArray and a root.id defined", function(done) {
        var filterComponent = getNewFilterComponent({
          componentDefinition: {
            multiselect: true
          },
          componentOutput: {
            outputFormat: "highestID"
          },
          options: function() {
            return {
              input: {
                root: {
                  id: rootId
                }
              }
            };
          }
        });

        expectSelection(filterComponent, dashboard, {root: true}, done);
      });

      it("works with dataSource and a root.id defined", function(done) {
        var filterComponent = getNewFilterComponent({
          componentDefinition: {
            multiselect: true
          },
          queryDefinition: {
            dataSource: "selectionDataSource"
          },
          componentInput: {
            valuesArray: []
          },
          componentOutput: {
            outputFormat: "highestID"
          },
          options: function() {
            return {
              input: {
                root: {
                  id: rootId
                }
              }
            };
          }
        });

        dashboard.addDataSource("selectionDataSource", {
          dataAccessId: "testId",
          path: "/test.cda"
        });

        spyOn($, 'ajax').and.callFake(function(params) {
          params.success(testData);
        });

        expectSelection(filterComponent, dashboard, {root: true}, done);
      });
    });

  });
});
