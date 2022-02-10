let
  lock = builtins.fromJSON (builtins.readFile ./flake.lock);
  tarball = fetchTarball {
    url = "https://github.com/edolstra/flake-compat/archive/${lock.nodes.flake-compat.locked.rev}.tar.gz";
    sha256 = lock.nodes.flake-compat.locked.narHash;
  };
  lib = import tarball {
    src = ./.;
  };
in
  lib.shellNix
