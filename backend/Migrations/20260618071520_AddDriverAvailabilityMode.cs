using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BdCabs.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddDriverAvailabilityMode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AvailabilityMode",
                table: "DriverProfiles",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AvailabilityMode",
                table: "DriverProfiles");
        }
    }
}
