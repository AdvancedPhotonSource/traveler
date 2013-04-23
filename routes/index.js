

exports.main = function(req, res) {
  res.render('main', { username: req.session.username});
};

exports.builder = function(req, res) {
  res.render('builder');
};

exports.logout = function(req, res) {
  if (req.session) {
    req.session.destroy(function(err) {
      if (err) {
        console.error(err);
      }
    });
  }
  res.redirect('https://liud-dev.nscl.msu.edu/cas/logout');
};