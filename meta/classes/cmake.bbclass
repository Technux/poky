# Path to the CMake file to process.
OECMAKE_SOURCEPATH ?= "${S}"

DEPENDS_prepend = "cmake-native "
B = "${WORKDIR}/build"

# We need to unset CCACHE otherwise cmake gets too confused
CCACHE = ""

# We want the staging and installing functions from autotools
inherit autotools

# C/C++ Compiler (without cpu arch/tune arguments)
OECMAKE_C_COMPILER ?= "`echo ${CC} | sed 's/^\([^ ]*\).*/\1/'`"
OECMAKE_CXX_COMPILER ?= "`echo ${CXX} | sed 's/^\([^ ]*\).*/\1/'`"
OECMAKE_AR ?= "${AR}"

# Compiler flags
OECMAKE_C_FLAGS ?= "${HOST_CC_ARCH} ${TOOLCHAIN_OPTIONS} ${CFLAGS}"
OECMAKE_CXX_FLAGS ?= "${HOST_CC_ARCH} ${TOOLCHAIN_OPTIONS} ${CXXFLAGS}"
OECMAKE_C_FLAGS_RELEASE ?= "${SELECTED_OPTIMIZATION} ${CFLAGS} -DNDEBUG"
OECMAKE_CXX_FLAGS_RELEASE ?= "${SELECTED_OPTIMIZATION} ${CXXFLAGS} -DNDEBUG"
OECMAKE_C_LINK_FLAGS ?= "${HOST_CC_ARCH} ${TOOLCHAIN_OPTIONS} ${CPPFLAGS} ${LDFLAGS}"
OECMAKE_CXX_LINK_FLAGS ?= "${HOST_CC_ARCH} ${TOOLCHAIN_OPTIONS} ${CXXFLAGS} ${LDFLAGS}"

OECMAKE_RPATH ?= ""
OECMAKE_PERLNATIVE_DIR ??= ""
OECMAKE_EXTRA_ROOT_PATH ?= ""

OECMAKE_FIND_ROOT_PATH_MODE_PROGRAM = "ONLY"
OECMAKE_FIND_ROOT_PATH_MODE_PROGRAM_class-native = "BOTH"

cmake_do_generate_toolchain_file() {
	cat > ${WORKDIR}/toolchain.cmake <<EOF
# CMake system name must be something like "Linux".
# This is important for cross-compiling.
set( CMAKE_SYSTEM_NAME `echo ${TARGET_OS} | sed -e 's/^./\u&/' -e 's/^\(Linux\).*/\1/'` )
set( CMAKE_SYSTEM_PROCESSOR ${TARGET_ARCH} )
set( CMAKE_C_COMPILER ${OECMAKE_C_COMPILER} )
set( CMAKE_CXX_COMPILER ${OECMAKE_CXX_COMPILER} )
set( CMAKE_ASM_COMPILER ${OECMAKE_C_COMPILER} )
set( CMAKE_AR ${OECMAKE_AR} CACHE FILEPATH "Archiver" )
set( CMAKE_C_FLAGS "${OECMAKE_C_FLAGS}" CACHE STRING "CFLAGS" )
set( CMAKE_CXX_FLAGS "${OECMAKE_CXX_FLAGS}" CACHE STRING "CXXFLAGS" )
set( CMAKE_ASM_FLAGS "${OECMAKE_C_FLAGS}" CACHE STRING "ASM FLAGS" )
set( CMAKE_C_FLAGS_RELEASE "${OECMAKE_C_FLAGS_RELEASE}" CACHE STRING "CFLAGS for release" )
set( CMAKE_CXX_FLAGS_RELEASE "${OECMAKE_CXX_FLAGS_RELEASE}" CACHE STRING "CXXFLAGS for release" )
set( CMAKE_ASM_FLAGS_RELEASE "${OECMAKE_C_FLAGS_RELEASE}" CACHE STRING "ASM FLAGS for release" )
set( CMAKE_C_LINK_FLAGS "${OECMAKE_C_LINK_FLAGS}" CACHE STRING "LDFLAGS" )
set( CMAKE_CXX_LINK_FLAGS "${OECMAKE_CXX_LINK_FLAGS}" CACHE STRING "LDFLAGS" )

# only search in the paths provided so cmake doesnt pick
# up libraries and tools from the native build machine
set( CMAKE_FIND_ROOT_PATH ${STAGING_DIR_HOST} ${STAGING_DIR_NATIVE} ${CROSS_DIR} ${OECMAKE_PERLNATIVE_DIR} ${OECMAKE_EXTRA_ROOT_PATH} ${EXTERNAL_TOOLCHAIN})
set( CMAKE_FIND_ROOT_PATH_MODE_PACKAGE ONLY )
set( CMAKE_FIND_ROOT_PATH_MODE_PROGRAM ${OECMAKE_FIND_ROOT_PATH_MODE_PROGRAM} )
set( CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY )
set( CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY )

# Use qt.conf settings
set( ENV{QT_CONF_PATH} ${WORKDIR}/qt.conf )

# We need to set the rpath to the correct directory as cmake does not provide any
# directory as rpath by default
set( CMAKE_INSTALL_RPATH ${OECMAKE_RPATH} )

# Use native cmake modules
list(APPEND CMAKE_MODULE_PATH "${STAGING_DATADIR}/cmake/Modules/")

# add for non /usr/lib libdir, e.g. /usr/lib64
set( CMAKE_LIBRARY_PATH ${libdir} ${base_libdir})

EOF
}

addtask generate_toolchain_file after do_patch before do_configure

cmake_do_configure() {
	if [ "${OECMAKE_BUILDPATH}" ]; then
		bbnote "cmake.bbclass no longer uses OECMAKE_BUILDPATH.  The default behaviour is now out-of-tree builds with B=WORKDIR/build."
	fi

	if [ "${S}" != "${B}" ]; then
		rm -rf ${B}
		mkdir -p ${B}
		cd ${B}
	else
		find ${B} -name CMakeFiles -or -name Makefile -or -name cmake_install.cmake -or -name CMakeCache.txt -delete
	fi

	# Just like autotools cmake can use a site file to cache result that need generated binaries to run
	if [ -e ${WORKDIR}/site-file.cmake ] ; then
		OECMAKE_SITEFILE=" -C ${WORKDIR}/site-file.cmake"
	else
		OECMAKE_SITEFILE=""
	fi

	cmake \
	  ${OECMAKE_SITEFILE} \
	  ${OECMAKE_SOURCEPATH} \
	  -DCMAKE_INSTALL_PREFIX:PATH=${prefix} \
	  -DCMAKE_INSTALL_BINDIR:PATH=${bindir} \
	  -DCMAKE_INSTALL_SBINDIR:PATH=${sbindir} \
	  -DCMAKE_INSTALL_LIBEXECDIR:PATH=${libexecdir} \
	  -DCMAKE_INSTALL_SYSCONFDIR:PATH=${sysconfdir} \
	  -DCMAKE_INSTALL_SHAREDSTATEDIR:PATH=${sharedstatedir} \
	  -DCMAKE_INSTALL_LOCALSTATEDIR:PATH=${localstatedir} \
	  -DCMAKE_INSTALL_LIBDIR:PATH=${libdir} \
	  -DCMAKE_INSTALL_INCLUDEDIR:PATH=${includedir} \
	  -DCMAKE_INSTALL_DATAROOTDIR:PATH=${datadir} \
	  -DCMAKE_INSTALL_SO_NO_EXE=0 \
	  -DCMAKE_TOOLCHAIN_FILE=${WORKDIR}/toolchain.cmake \
	  -DCMAKE_VERBOSE_MAKEFILE=1 \
	  ${EXTRA_OECMAKE} \
	  -Wno-dev
}

cmake_do_compile()  {
	cd ${B}
	base_do_compile
}

cmake_do_install() {
	cd ${B}
	autotools_do_install
}

EXPORT_FUNCTIONS do_configure do_compile do_install do_generate_toolchain_file
