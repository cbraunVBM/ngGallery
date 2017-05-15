angular.module('jkuri.gallery', ['ui.bootstrap','ngAnimate','ngTouch','ngRoute'])

.directive('ngGallery', ['$document', '$timeout', '$q', '$templateCache','$location', function($document, $timeout, $q, $templateCache,$location) {
	'use strict';

	var defaults = { 
		baseClass   : 'ng-gallery',
		thumbClass  : 'ng-thumb',
		templateUrl : 'ng-gallery.html'
	};

	var keys_codes = {
		enter : 13,
		esc   : 27,
		left  : 37,
		right : 39
	};

	function setScopeValues(scope, attrs) {
		scope.baseClass = scope.class || defaults.baseClass;
		scope.thumbClass = scope.thumbClass || defaults.thumbClass;
		scope.thumbsNum = scope.thumbsNum || 3; // should be odd
	}

	var template_url = defaults.templateUrl;
	// Set the default template
  	$templateCache.put(template_url,
	'<div class="{{ baseClass }}">' +
	'  <uib-carousel active="0" on-carousel-change="onSlideChanged(nextSlide, direction)">' +
    '       <uib-slide ng-repeat="i in slides" index="$index">' +
    '          <youtube-video ng-if="i.type && i.type == \'video\'" class="embed-responsive-item" video-url="i.url"></youtube-video> '+
	'          <img ng-if="i.thumb" ng-src="{{ i.thumb }}" class="{{ thumbClass }}" ng-click="openGallery($index)" alt="{{ i.alt }}: {{ $index + 1 }}" />' +
	'       </uib-slide>'+
    '  </uib-carousel>' +
	'</div>' +
	'<div class="ng-overlay" ng-show="opened">' +
	'</div>' +
	'<div class="ng-gallery-content" ng-show="opened">' +
	'  <a class="close-popup" ng-click="closeGallery()"><i class="fa fa-close"></i></a>' +
	'  <a class="nav-left" ng-click="prevImage()"><i class="fa fa-angle-left"></i></a>' +
	'  <img ng-src="{{ img }}" ng-click="nextImage()" ng-swipe-right="nextImage()" ng-swipe-left="prevImage()" ng-show="!loading" class="effect" alt="{{ alt }}"/>' +
	'  <a class="nav-right" ng-click="nextImage()"><i class="fa fa-angle-right"></i></a>' +
	'  <span class="info-text">{{ index + 1 }}/{{ images.length }}</span>' +
	'  <div class="ng-thumbnails-wrapper">' +
	'    <div class="ng-thumbnails slide-left">' +
	'      <div ng-repeat="i in images">' + 
	'        <img ng-src="{{ i.thumb }}" ng-class="{\'active\': index === $index}" ng-click="changeImage($index)" />' +
	'      </div>' +
	'    </div>' +
	'  </div>' +
	'</div>'
	);

	return {
		restrict: 'EA',
		scope: {
			images: '=',
			thumbsNum: '@',
			video: '='
		},
		templateUrl: function(element, attrs) {
        		return attrs.templateUrl || defaults.templateUrl;
    		},
		link: function (scope, element, attrs) {
			setScopeValues(scope, attrs);

			if (scope.thumbsNum >= 11) {
				scope.thumbsNum = 11;
			}

			var $body = $document.find('body');
			var $thumbwrapper = angular.element(document.querySelectorAll('.ng-thumbnails-wrapper'));
			var $thumbnails = angular.element(document.querySelectorAll('.ng-thumbnails'));

			scope.slides = [];
			if(scope.video && scope.video.length > 0){
				var obj_video = {
					"url":scope.video,
					"type":"video"
				}
				scope.slides.push(obj_video);
			}
			scope.images.forEach(function(element) {
				scope.slides.push(element);
			}, this);
			
			scope.index = 0;
			scope.opened = false;

			scope.thumb_wrapper_width = 0;
			scope.thumbs_width = 0;

			var loadImage = function (i) {
				var deferred = $q.defer();
				var image = new Image();

				image.onload = function () {
					scope.loading = false;
				        if (typeof this.complete === false || this.naturalWidth === 0) {
				        	deferred.reject();
				      	}
				      	deferred.resolve(image);
				};
		
				image.onerror = function () {
					deferred.reject();
				};
				
				image.src = scope.images[i].img;
				image.alt = scope.images[i].alt;
				scope.loading = true;

				return deferred.promise;
			};

			var showImage = function (i) {
				loadImage(scope.index).then(function(resp) {
					scope.img = resp.src;
					scope.alt = resp.alt;
					smartScroll(scope.index);
				});
				scope.description = scope.images[i].description || '';
				  ga('send', 'pageview', $location.path());
			};

			scope.changeImage = function (i) {
				scope.index = i;
				loadImage(scope.index).then(function(resp) {
					scope.img = resp.src;
					scope.alt = resp.alt;

					smartScroll(scope.index);
				});
				 ga('send', 'pageview', $location.path());
			};

			scope.nextImage = function () {
				scope.index += 1;
				if (scope.index === scope.images.length) {
					scope.index = 0;
				}
				showImage(scope.index);
			};

			scope.prevImage = function () {
				scope.index -= 1;
				if (scope.index < 0) {
					scope.index = scope.images.length - 1;
				}
				showImage(scope.index);
			};

			scope.openGallery = function (i) {
				if (typeof i !== undefined) {
					scope.index = i;
					showImage(scope.index);
				}
				scope.opened = true;

				$timeout(function() {
					var calculatedWidth = calculateThumbsWidth();
					scope.thumbs_width = calculatedWidth.width;
					$thumbnails.css({ width: calculatedWidth.width + 'px' });
					$thumbwrapper.css({ width: calculatedWidth.visible_width + 'px' });
					smartScroll(scope.index);
				});
			};

			scope.closeGallery = function () {
				scope.opened = false;
			};

			scope.onSlideChanged = function(nextSlide, direction){
				 //do not track initial loading
				 if(typeof direction != "undefined"){
				  ga('send', 'pageview', $location.path());
				 }
			}

			$body.bind('keydown', function(event) {
				if (!scope.opened) {
					return;
				}
				var which = event.which;
				if (which === keys_codes.esc) {
					scope.closeGallery();
				} else if (which === keys_codes.right || which === keys_codes.enter) {
					scope.nextImage();
				} else if (which === keys_codes.left) {
					scope.prevImage();
				}

				scope.$apply();
			});

			var calculateThumbsWidth = function () {
				var width = 0,
					visible_width = 0;
				angular.forEach($thumbnails.find('img'), function(thumb) {
					width += thumb.clientWidth;
					width += 10; // margin-right
					visible_width = thumb.clientWidth + 10;
				});
				return {
					width: width,
					visible_width: visible_width * scope.thumbsNum
				};
			};

			var smartScroll = function (index) {
				$timeout(function() {
					var len = scope.images.length,
				 	    width = scope.thumbs_width,
					    current_scroll = $thumbwrapper[0].scrollLeft,
					    item_scroll = parseInt(width / len, 10),
					    i = index + 1,
					    s = Math.ceil(len / i);

					$thumbwrapper[0].scrollLeft = 0;
					$thumbwrapper[0].scrollLeft = i * item_scroll - (s * item_scroll);
				}, 100);
			};

		}
	};

}]);


angular.module('jkuri.gallery').directive('onCarouselChange',["$parse",function ($parse) {
  return {
    require: 'uib-carousel',
    link: function (scope, element, attrs, carouselCtrl) {
      var fn = $parse(attrs.onCarouselChange);
      var origSelect = carouselCtrl.select;
      carouselCtrl.select = function (nextSlide, direction) {
        if (nextSlide !== this.currentSlide) {
          fn(scope, {
            nextSlide: nextSlide,
            direction: direction,
          });
        }
        return origSelect.apply(this, arguments);
      };
    }
  };
}]);
