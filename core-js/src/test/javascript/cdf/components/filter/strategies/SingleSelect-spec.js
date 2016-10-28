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
  'amd!cdf/lib/underscore',
  'cdf/components/filter/core/Model',
  'cdf/components/filter/strategies/SingleSelect'
], function(_ , Model, SingleSelect) {

  describe('Filter.SelectionStrategies.SingleSelect', function() {
    var SelectionStates = Model.SelectionStates;

    var model;
    var strategy;

    describe('at a depth of 1 level', function() {
      beforeEach(function() {
        strategy = new SingleSelect();
        return model = new Model({
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
      it('successfully marks a single item as selected', function() {
        var someLeaf = model.children().first();
        var otherLeaf = model.children().last();

        strategy.setSelection(SelectionStates.ALL, someLeaf);
        strategy.setSelection(SelectionStates.ALL, otherLeaf);

        var selectedItems = model.where({ isSelected: true });
        expect( selectedItems.length ).toBe(1);
        expect( selectedItems[0] ).toBe( otherLeaf );
      });

      it('cannot unselect an item', function() {
        var someLeaf = model.children().last();

        strategy.setSelection(SelectionStates.ALL, someLeaf);
        strategy.setSelection(SelectionStates.NONE, someLeaf);

        var selectedItems = model.where({ isSelected: true });
        expect( selectedItems.length ).toBe(1);
        expect( selectedItems[0] ).toBe( someLeaf );
      });

      it('does not allow the root to be selected', function() {
        strategy.setSelection(SelectionStates.ALL, model);

        var selectedItems = model.where({ isSelected: true });
        expect(selectedItems.length).toBe(0);
      });
    });

    describe('at a depth of 2 levels', function() {
      beforeEach(function() {
        strategy = new SingleSelect();
        return model = new Model({
          label: 'Root',
          id: '#root',
          isSelected: false,
          nodes: _.map(_.range(3), function(n) {
            return {
              label: "Group " + n,
              id: "#group " + n,
              nodes: _.map(_.range(5), function(k) {
                return {
                  label: "#Item " + n + "." + k,
                  id: "#item " + n + k + "."
                };
              })
            };
          })
        });
      });

      it('ensures a single item as selected', function() {
        var someLeaf = model.children().first().children().first();
        var otherLeaf = model.children().last().children().last();
        strategy.setSelection(SelectionStates.ALL, someLeaf);
        strategy.setSelection(SelectionStates.ALL, otherLeaf);

        var selectedItems = model.where({ isSelected: true });
        expect( selectedItems.length ).toBe(1);
        expect( selectedItems[0] ).toBe( otherLeaf );
      });

      it('cannot unselect an item', function() {
        var someLeaf = model.children().last().children().last();
        strategy.setSelection(SelectionStates.ALL, someLeaf);
        strategy.setSelection(SelectionStates.NONE, someLeaf);

        var selectedItems = model.where({ isSelected: true });
        expect( selectedItems.length ).toBe(1);
        expect( selectedItems[0] ).toBe( someLeaf );
      });

      it('does not allow a group to be selected', function() {
        var someParent = model.children().first();
        strategy.setSelection(SelectionStates.ALL, someParent);

        var selectedItems = model.where({
          isSelected: true
        });

        expect( selectedItems.length ).toBe(0);
      });
    });
  });
});
