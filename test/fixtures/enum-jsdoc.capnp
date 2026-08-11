@0xa98df793ff931f7a;

enum Color {
  # The available colors.

  red @0;
  # Red color.

  green @1;

  blue @2;
  # Blue color.
}

struct Service {
  # A named service.

  name @0 :Text;
  # Service name.

  union {
    unspecified @1 :Void;
    # Catches missing union member.

    worker @2 :Void;
    # A Worker.

    network @3 :Void;
  }
}
