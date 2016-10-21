define([
  'amd!cdf/lib/underscore',
  'cdf/components/filter/core/Model',
  'cdf/components/filter/strategies/LimitedSelect'
], function(_, Model, LimitedSelect) {

  describe('Filter.SelectionStrategies.LimitedSelect', function() {
    var SelectionStates = Model.SelectionStates;

    var model;
    var strategy;

    describe('#changeSelection, at a depth of 1 level', function() {
      beforeEach(function() {
        strategy = new LimitedSelect({
          limit: 5
        });
        return model = new Model({
          id: '#parent',
          isSelected: false,
          nodes: _.map(_.range(10), function(n) {
            return {
              id: "#child" + n,
              isSelected: false
            };
          })
        });
      });

      it('successfully marks items as selected, when below the limit', function() {
        var someLeaf = model.children().first();
        var otherLeaf = model.children().last();

        strategy.changeSelection(someLeaf);
        strategy.changeSelection(otherLeaf);

        var selectedItems = model.where({isSelected: SelectionStates.ALL});
        expect(selectedItems.length).toBe(2);
        expect(selectedItems[0]).toBe(someLeaf);
        expect(selectedItems[1]).toBe(otherLeaf);
      });

      it('prevents selecting an item if that goes beyond the limit', function() {

        var models = model.children().chain().first(6).map(function(m){
          strategy.changeSelection(m);
          return m;
        }).value();

        var selectedItems = model.where({isSelected: SelectionStates.ALL});

        expect(selectedItems.length).toBe(5);
        _.each(selectedItems, function(n, idx) {
          expect(n).toBe(models[idx]);
        });

      });

      it('does not allow the root to be selected if it contains more items than the limit', function() {
        strategy.changeSelection(model);

        var selectedItems = model.getSelectedItems();
        expect(selectedItems.length).toBe(0);
      });
    });

    describe('#changeSelection, at a depth of 2 levels', function() {
      beforeEach(function() {
        strategy = new LimitedSelect({
          limit: 5
        });
        return model = new Model({
          id: '#root',
          isSelected: false,
          nodes: _.map(_.range(3), function(n) {
            return {
              id: "#group " + n,
              isSelected: false,
              nodes: _.map(_.range(2 + 2*n), function(k) {
                return {
                  id: "#item " + n + "." + k,
                  isSelected: false
                };
              })
            };
          })
        });
      });

      it('successfully marks items as selected, when below the limit', function() {
        strategy.changeSelection(model.find("#item 0.1"));
        strategy.changeSelection(model.find("#item 2.5"));

        var selectedItems = model.getSelectedItems();
        expect(selectedItems).toEqual(["#item 0.1", "#item 2.5"]);
      });

      it('allows unselecting an item', function() {
        var someLeaf = model.find("#item 0.0");
        strategy.changeSelection(someLeaf);
        expect(model.getSelectedItems()).toEqual(["#item 0.0"]);

        strategy.changeSelection(someLeaf);
        expect(model.getSelectedItems()).toEqual([]);
      });

      it('allows selecting a group if the number of items selected is smaller than the limit', function() {
        strategy.changeSelection(model.find("#group 0")); // 2 items

        expect(model.getSelectedItems()).toEqual(["#group 0"]);
        expect(model.countSelectedItems()).toBe(2);
      });

      it('does not allow a selecting a group if that leads to having more items selected than the limit', function() {
        strategy.changeSelection(model.find("#group 2")); // 6 items

        expect(model.getSelectedItems()).toEqual([]);
        expect(model.countSelectedItems()).toBe(0);
      });

    });
  });
});
