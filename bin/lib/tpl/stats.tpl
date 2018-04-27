<!doctype html>
<html>
    <head>
        <link rel="stylesheet" href="https://unpkg.com/onsenui/css/onsenui.css">
        <link rel="stylesheet" href="https://unpkg.com/onsenui/css/onsen-css-components.min.css">
        <script src="https://unpkg.com/onsenui/js/onsenui.min.js"></script>
        <script src="https://momentjs.com/downloads/moment-with-locales.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.5.0/Chart.min.js"></script>
        <script src="https://unpkg.com/jquery/dist/jquery.min.js"></script>
        
    </head>
    <body>
    <div style="width:300px;height:200px">
            <canvas id="line-chart" style="border:"1px solid black"></canvas>
</div>
        <script>

        var ctx = document.getElementById("line-chart").getContext('2d');
        console.log(ctx);
        new Chart(ctx, {
  type: 'line',
  data: [{
    x: new Date(),
    y: 1
}, {
    t: new Date(),
    y: 100
}],
  options: {
    scales: {
            xAxes: [{
                type: 'time'
            }]
    },
    title: {
      display: true,
      text: 'Memory'
    }
  }
});

        // Initialization code
        $('ons-button').on('click', function(e) {
            ons.notification.alert('Button is tapped!');
        })

        </script>
        <ons-button>Click me!</ons-button>
    </body>
</html>