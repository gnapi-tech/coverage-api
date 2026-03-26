import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateTestRunDto } from './dto/create-test-run.dto';
import { ProjectAuthGuard } from './guards/project-auth.guard';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  /*--------------------Create Project-----------------------*/
  @Post()
  create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(createProjectDto);
  }

  /*--------------------Get All Project-----------------------*/
  @Get()
  findAll() {
    return this.projectsService.findAll();
  }

  /*--------------------Get Project API Keys-----------------------*/
  @UseGuards(ProjectAuthGuard)
  @Get(':id/api-keys')
  getApiKeys(@Param('id') id: string) {
    return this.projectsService.getApiKeys(id);
  }

  /*--------------------Get Project Test Runs-----------------------*/
  // @UseGuards(ProjectAuthGuard)
  @Get(':id/test-runs')
  getTestRuns(@Param('id') id: string) {
    return this.projectsService.getTestRuns(id);
  }

  /*--------------------Create Project Test Run-----------------------*/
  @UseGuards(ProjectAuthGuard)
  @Post(':id/test-runs')
  createTestRun(
    @Param('id') id: string,
    @Body() createTestRunDto: CreateTestRunDto,
  ) {
    return this.projectsService.createTestRun(id, createTestRunDto);
  }

  /*--------------------Get One Project-----------------------*/
  @UseGuards(ProjectAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  /*--------------------Update Project-----------------------*/
  @UseGuards(ProjectAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto) {
    return this.projectsService.update(id, updateProjectDto);
  }

  /*--------------------Delete Project-----------------------*/
  @UseGuards(ProjectAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }
}
