#
# SPDX-License-Identifier: MIT
#

import os

from oeqa.selftest.case import OESelftestTestCase
from oeqa.utils.commands import get_bb_var, bitbake

class TestEmptyImage(OESelftestTestCase):
    '''Tests for the manifest files and contents of an image'''

    #this will possibly move from here
    @classmethod
    def get_dir_from_bb_var(self, bb_var, target = None):
        target == self.buildtarget if target == None else target
        directory = get_bb_var(bb_var, target);
        if not directory or not os.path.isdir(directory):
            self.logger.debug("{}: {} points to {} when target = {}"\
                    .format(self.classname, bb_var, directory, target))
            raise OSError
        return directory

    @classmethod
    def setUpClass(self):

        super(TestEmptyImage, self).setUpClass()
        self.buildtarget = 'test-empty-image'
        self.classname = 'TestEmptyImage'

        self.logger.info("{}: doing bitbake {} as a prerequisite of the test"\
                .format(self.classname, self.buildtarget))
        if bitbake(self.buildtarget).status:
            self.logger.debug("{} Failed to setup {}"\
                    .format(self.classname, self.buildtarget))
            self.skipTest("{}: Cannot setup testing scenario"\
                    .format(self.classname))


    def test_empty_manifest(self):
        '''Verifying the image manifest entries exist'''

        # get manifest location based on target to query about
        try:
            mdir = self.get_dir_from_bb_var('DEPLOY_DIR_IMAGE',
                                                self.buildtarget)
            mfilename = get_bb_var("IMAGE_LINK_NAME", self.buildtarget)\
                    + ".manifest"
            mpath = os.path.join(mdir, mfilename)
            if not os.path.isfile(mpath): raise IOError
        except OSError:
            raise self.skipTest("{}: Error in obtaining manifest dirs"\
                .format(self.classname))
        except IOError:
            msg = "{}: Error cannot find manifests in dir:\n{}"\
                    .format(self.classname, mdir)
            self.fail(msg)

        if os.stat(mpath).st_size != 0:
            msg = "{}: Error manifest is not empty, as expected."\
                    .format(self.classname)
            self.fail(msg)
