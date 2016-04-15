
var controls = document.querySelectorAll('[aria-controls]');
var addClickListener = function(control){
  control.addEventListener('click',function() {   
    var target = document.getElementById(this.getAttribute('aria-controls'));
    var isHidden = this.getAttribute('aria-selected') === 'false';
    this.setAttribute('aria-selected',isHidden);
    target.setAttribute('aria-hidden',!isHidden);
  });
}
for(var i=0;i< controls.length; i++) {
  addClickListener(controls[i]);
}

