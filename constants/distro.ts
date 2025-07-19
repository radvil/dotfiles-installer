/**
 * A constant object mapping Linux distribution IDs to their default package managers.
 * This is used to determine the appropriate package manager for a given distribution.
 * The `as const` assertion ensures that the object is deeply immutable and its keys
 * and values are inferred as literal types.
 */
export const PackagerByDistro = {
  fedora: "dnf",
  nobara: "dnf",
  arch: "pacman",
  cachyos: "pacman",
} as const;

/**
 * A union type representing the supported Linux distribution IDs.
 * This type is derived from the keys of the `PackagerByDistro` object.
 */
export type DistroId = keyof typeof PackagerByDistro;

/**
 * A union type representing the package managers associated with the supported distributions.
 * This type is derived from the values of the `PackagerByDistro` object.
 */
export type DistroPackager = (typeof PackagerByDistro)[DistroId];
