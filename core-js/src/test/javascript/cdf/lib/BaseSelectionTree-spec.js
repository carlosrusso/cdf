define([
  'cdf/lib/jquery',
  'amd!cdf/lib/underscore',
  'cdf/lib/BaseSelectionTree'
], function($, _, BaseSelectionTree) {

  var SelectionStates = BaseSelectionTree.SelectionStates;

  describe('BaseSelectionTree', function() {

    var model;

    describe('accepts object literals nested around the "node" property', function() {
      beforeEach(function() {
        model = new BaseSelectionTree({
          id: '#root',
          nodes: [
            {
              id: '#item'
            }
          ]
        });
      });
      it('has the correct parent id', function() {
        expect(model.get('id')).toBe('#root');
      });
      it('contains the correct children', function() {
        expect(model.children().models.length).toBe(1);
        expect(model.children().at(0).get('id')).toBe("#item");
      });
    });

    describe("#setSelection", function() {
      describe('propagates the selection state correctly (top-level groups)', function() {
        beforeEach(function() {
          return model = new BaseSelectionTree({
            label: 'Parent',
            id: '#parent',
            isSelected: false,
            nodes: _.map(_.range(10), function(n) {
              var result;
              result = {
                label: 'Child #{n}',
                id: "#child" + n,
                isSelected: false
              };
              return result;
            })
          });
        });

        it('marks all children as selected upon selecting the root', function() {
          model.setSelection(true);
          expect(model.flatten().all(function(m) {
            return m.getSelection() === SelectionStates.ALL;
          }).value()).toBe(true);
        });

        it('marks all children as unselected upon unselecting the root', function() {
          model.setSelection(false);
          expect(model.flatten().all(function(m) {
            return m.getSelection() === SelectionStates.NONE;
          }).value()).toBe(true);
        });

        it('is partially selected if only some of its children are selected', function() {
          model.setSelection(false);
          model.children().last().setSelection(SelectionStates.ALL);
          expect(model.getSelection()).toBe(SelectionStates.SOME);
        });

      })

      describe('propagates the selection state correctly (nested groups)', function() {
        beforeEach(function() {
          model = new BaseSelectionTree({
            id: '#root',
            isSelected: false,
            nodes: _.map(_.range(3), function(n) {
              return {
                id: "#group " + n,
                nodes: _.map(_.range(5), function(k) {
                  return {
                    id: "#item " + [n, k].join(".")
                  };
                })
              };
            })
          });
        });

        it('marks all children as selected upon selecting the root', function() {
          model.setSelection(true);

          expect(model.flatten()
            .all(function(m) {
              return m.getSelection() === SelectionStates.ALL;
            })
            .value()
          ).toBe(true);
        });

        it('marks all children as unselected upon unselecting the root', function() {
          model.setSelection(false);

          expect(model.flatten()
            .all(function(m) {
              return m.getSelection() === SelectionStates.NONE;
            })
            .value()
          ).toBe(true);
        });

        it('marks the parents as partially selected if only some of its children are selected', function() {
          model.setSelection(false);
          model.find("#item 2.2").setSelection(SelectionStates.ALL);

          expect(model.getSelection()).toBe(SelectionStates.SOME);
          expect(model.find("#group 2").getSelection()).toBe(SelectionStates.SOME);
        });

      });

    }); // #setSelection

    describe('#filter', function() {

      beforeEach(function() {
        model = new BaseSelectionTree({
          id: '#root',
          isSelected: false,
          nodes: _.map(_.range(3), function(n) {
            return {
              id: "#group " + n,
              isSelected: false,
              nodes: _.map(_.range(5), function(k) {
                return {
                  id: "#item " + [n, k].join("."),
                  isSelected: false
                };
              })
            };
          })
        });
      });

    })
  });
});

