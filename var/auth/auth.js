$(window, document, undefined).ready(function() {
	$('input').blur(function() {
		var $this = $(this);
		if ($this.val())
		  $this.addClass('used');
		else
		  $this.removeClass('used');
	});

  	var $ripples = $('.ripples');

  	$ripples.on('click.Ripples', function(e) {

		var $this = $(this);
		var $offset = $this.parent().offset();
		var $circle = $this.find('.ripplesCircle');

		var x = e.pageX - $offset.left;
		var y = e.pageY - $offset.top;

		$circle.css({
		  top: y + 'px',
		  left: x + 'px'
		});

		$this.addClass('is-active');

  	});

	$ripples.on('animationend webkitAnimationEnd mozAnimationEnd oanimationend MSAnimationEnd', function(e) {
		$(this).removeClass('is-active');
	});
	
	$("button").on('click',function() {
		var crypt=new Crypt();
		var p=crypt.HASH.sha512($('input')[1].value);
		var q={
			l: $('input')[0].value,
			p: crypt.HASH.sha512($('input')[1].value).toString()
		};
		$.ajax({
  			method: "POST",
  			url: "/login",
  			data: q
		})
  		.done(function( msg ) {
    		msg=JSON.parse(msg);
			if (msg.success) {
				location.href=document.referrer+"auth/omneedia?pid="+msg.pid;	
			} else alert("Please enter a correct email and password. Note that both fields may be case-sensitive.");
  		});
	})

});		