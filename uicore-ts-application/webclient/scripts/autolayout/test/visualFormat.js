/*global describe, it*/
var assert = (typeof window === 'undefined') ? require('assert') : window.chai.assert;
var AutoLayout = (typeof window === 'undefined') ? require('../dist/autolayout') : window.AutoLayout;

describe('VisualFormat', function () {
    describe('parse', function () {
        it('should return 2 contraints for: ' + '|[child]|', function () {
            var constraints = AutoLayout.VisualFormat.parse('|[child]|');
            assert.equal(2, constraints.length);
        });
        it('should return 1 contraint for: ' + '[child][child2]', function () {
            var constraints = AutoLayout.VisualFormat.parse('[child][child2]');
            assert.equal(1, constraints.length);
        });
        it('should return 1 contraint for: ' + '[child(60)] with constant 60', function () {
            var constraints = AutoLayout.VisualFormat.parse('[child(60)]');
            assert.equal(1, constraints.length);
            assert.equal(constraints[0].constant, 60);
        });
        it('should return 1 contraint for: ' + '[child(60.6666)] with constant 60.6666', function () {
            var constraints = AutoLayout.VisualFormat.parse('[child(60.6666)]');
            assert.equal(1, constraints.length);
            assert.equal(constraints[0].constant, 60.6666);
        });
    });
});
