'use strict';

(function() {
  var _generateTransitionStyle = function(transition) {
    var name = transition.name;
    var vendors = ['webkit', 'moz', 'ms', 'o'];
    
    var _generateDeclaration = function(property, value, transition) {
      switch (property) {
        case 'x':
          property = 'transform';
          value = 'translate3d(' + value + ', 0, 0)';
          break;
        case 'y':
          property = 'transform';
          value = 'translate3d(0, ' + value + ', 0)';
          break;
      }
      
      var declaration = property + ': ' + value + ';\n';
      
      if (property === 'transform' || property === 'transform-origin') {
        if (transition && property === 'transform') declaration += _generateDeclaration('transition', property + ' ' + transition.duration + ' ' + transition.easingFunction + ' ' + transition.delay);
        
        for (var i = 0, length = vendors.length; i < length; i++) {
          declaration += '-' + vendors[i] + '-' + property + ': ' + value + ';\n';
          if (transition && property === 'transform') declaration += _generateDeclaration( '-' + vendors[i] + '-' + 'transition', '-' + vendors[i] + '-' + property + ' ' + transition.duration + ' ' + transition.easingFunction + ' ' + transition.delay);
        }
      }
      
      return declaration;
    };
    
    var _generateDirection = function(pushOrPop) {
      var direction = transition[pushOrPop];
      if (!direction) return '';
      
      var setup = direction.setup || {};
      var setupWrapper = setup.wrapper, setupNewView = setup.newView, setupOldView = setup.oldView;
      var setupWrapperStyle = '', setupNewViewStyle = '', setupOldViewStyle = '';
      
      for (attr in setupWrapper) setupWrapperStyle += _generateDeclaration(attr, setupWrapper[attr]);
      for (attr in setupNewView) setupNewViewStyle += _generateDeclaration(attr, setupNewView[attr]);
      for (attr in setupOldView) setupOldViewStyle += _generateDeclaration(attr, setupOldView[attr]);
      
      var trans = direction.transition || {};
      var transA = trans.start, transB = trans.end;
      var transWrapperStyle = '', transNewViewStyle = '', transOldViewStyle = '';
      var attr;
      
      switch (trans.element.toUpperCase()) {
        case 'NEWVIEW':
          for (attr in transA) setupNewViewStyle += _generateDeclaration(attr, transA[attr], trans);
          for (attr in transB) transNewViewStyle += _generateDeclaration(attr, transB[attr]);
          break;
        case 'OLDVIEW':
          for (attr in transA) setupOldViewStyle += _generateDeclaration(attr, transA[attr], trans);
          for (attr in transB) transOldViewStyle += _generateDeclaration(attr, transB[attr]);
          break;
        case 'WRAPPER':
        default:
          for (attr in transA) setupWrapperStyle += _generateDeclaration(attr, transA[attr], trans);
          for (attr in transB) transWrapperStyle += _generateDeclaration(attr, transB[attr]);
          break;
      }
      
      var css = '';
      if (setupWrapperStyle) css += '.pp-view-wrapper.pp-' + pushOrPop + '.' + name + ' {\n' + setupWrapperStyle + '}\n';
      if (setupNewViewStyle) css += '.pp-view-wrapper.pp-' + pushOrPop + '.' + name + ' > .pp-view {\n' + setupNewViewStyle + '}\n';
      if (setupOldViewStyle) css += '.pp-view-wrapper.pp-' + pushOrPop + '.' + name + ' > .pp-view.pp-active {\n' + setupOldViewStyle + '}\n';
      if (transWrapperStyle) css += '.pp-view-wrapper.pp-' + pushOrPop + '.pp-transition.' + name + ' {\n' + transWrapperStyle + '}\n';
      if (transNewViewStyle) css += '.pp-view-wrapper.pp-' + pushOrPop + '.pp-transition.' + name + ' > .pp-view {\n' + transNewViewStyle + '}\n';
      if (transOldViewStyle) css += '.pp-view-wrapper.pp-' + pushOrPop + '.pp-transition.' + name + ' > .pp-view.pp-active {\n' + transOldViewStyle + '}\n';
      return css;
    };
    
    return _generateDirection('push') + _generateDirection('pop');
  };
  
  window.Pushpop = window['Pushpop'] || {
    defaultTransition: 'slide-horizontal',
    transitionsStyleElement: null,
    init: function() {
      
      // Generate CSS for Transitions.
      var transitions = this.Transitions, transitionsStyle = '', i, length;
      for (i = 0, length = transitions.length; i < length; i++) transitionsStyle += _generateTransitionStyle(transitions[i]);
      
      // Add <style/> tag to the <head/> for the CSS Transitions.
      var headElement = document.getElementsByTagName('head')[0];
      var transitionsStyleElement = this.transitionsStyleElement = document.createElement('style');
      transitionsStyleElement.setAttribute('type', 'text/css');
      transitionsStyleElement.innerHTML = transitionsStyle;
      headElement.appendChild(transitionsStyleElement);
      
      // Initialize all ViewStacks.
      var viewStackElements = document.getElementsByClassName('pp-view-stack');
      for (i = 0, length = viewStackElements.length; i < length; i++) new Pushpop.ViewStack(viewStackElements[i]);
    
      window.addEventListener('click', function(evt) {
        var target = evt.target;
        
        if (target.nodeName !== 'A') return;
        
        var className = ' ' + target.className.replace(/[\n\t]/g, ' ') + ' ';
        var href, transition, viewElement, view, viewStack;
        
        // Perform a push.
        if (className.indexOf(' pp-push ') !== -1) {
          href = target.getAttribute('href').substring(1);
          transition = target.getAttribute('data-transition');
          viewElement = document.getElementById(href);
          view = viewElement.view || new Pushpop.View(viewElement);
          viewStack = view.getViewStack();
          
          if (viewStack) viewStack.push(view, transition);
        }
        
        // Perform a pop.
        if (className.indexOf(' pp-pop ') !== -1) {
          
        }
        
        evt.preventDefault();
      });
    }
  };
  
  Pushpop.ViewStack = function(element) {
    var viewStack = element.viewStack;
    if (viewStack) return viewStack;
    
    this.element = element;
    element.viewStack = this;

    // Create the wrapper element.
    var wrapperElement = this.wrapperElement = document.createElement('div');
    wrapperElement.className = 'pp-view-wrapper';
    element.appendChild(wrapperElement);

    var views = this.views = [];

    // Initialize the Views.
    var childNodes = element.childNodes, childNode, classAttribute, view, rootView;
    for (var i = 0, length = childNodes.length; i < length; i++) {
      if (!(childNode = childNodes[i]) || childNode.tagName !== 'DIV') continue;
      if ((' ' + childNode.className.replace(/[\n\t]/g, ' ') + ' ').indexOf(' pp-view ') === -1) continue;
      
      // Move the View element into the wrapper.
      wrapperElement.appendChild(childNode);
      
      view = new Pushpop.View(childNode);
      
      // Set the first View as the root View.
      if (!rootView) {
        childNode.className += ' pp-active';
        rootView = this.rootView = view;
        views.push(rootView);
      }
    }
  };
  
  Pushpop.ViewStack.prototype = {
    element: null,
    wrapperElement: null,
    views: null,
    rootView: null,
    isTransitioning: false,
    getActiveView: function() {
      var views = this.views;
      var viewCount = views.length;

      return (viewCount === 0) ? null : views[viewCount - 1];
    },
    containsView: function(view) {
      var views = this.views;
      var viewCount = views.length;

      for (var i = viewCount - 1; i >= 0; i--) if (views[i] === view) return true;
      return false;
    },
    forceReflow: function() {
      return this.element.offsetWidth;
    },
    push: function(view, transition) {
      if (this.isTransitioning) return;
      this.isTransitioning = true;

      var oldView = this.getActiveView();
      var newView = view;

      var element = this.element;

      var oldViewElement = oldView.element;
      var newViewElement = newView.element;
      var wrapperElement = this.wrapperElement;

      // TODO: Trigger events.

      this.views.push(newView);

      // $newActiveViewElement.bind('webkitTransitionEnd transitionend oTransitionEnd transitionEnd', {
      //   newActiveView: newActiveView
      // }, this.handleEvent);

      transition = newView.transition = transition || newView.transition || Pushpop.defaultTransition;

      wrapperElement.className += ' pp-push ' + transition;
      
      //oldView.forceReflow();
      this.forceReflow();
      
      // TODO: Investigate use of setTimeout for Android
      wrapperElement.className += ' pp-transition';
    }
  };
  
  Pushpop.View = function(element) {
    var view = element.view;
    if (view) return view;
    
    this.element = element;
    element.view = this;
    
    this.title = element.getAttribute('data-view-title');
  };
  
  Pushpop.View.prototype = {
    element: null,
    transition: null,
    title: null,
    getViewStack: function() {
      return this.element.parentNode.parentNode.viewStack;
    }
  };
})();

window.addEventListener('load', function(evt) {
  Pushpop.init();
});