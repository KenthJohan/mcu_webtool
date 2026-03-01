#include <stdio.h>
#include <stdint.h>

struct Person
{
    char name[50];
    int32_t age;
};

struct Team
{
    char team_name[50];
    struct Person leader;
};

struct Team examples[] = {
    {"Alpha Team", {"Alice", 28}},
    {"Beta Team", {"Bob", 35}},
    {"Gamma Team", {"Charlie", 32}}};

int main(int argc, char *argv[])
{

    for (int i = 0; i < 3; i++)
    {
        printf("Team: %s, Leader: %s (Age: %d)\n",
               examples[i].team_name,
               examples[i].leader.name,
               examples[i].leader.age);
    }

    return 0;
}